#!/usr/bin/env node

import OpenAI from 'openai';
import fs from 'fs/promises';
import TelegramService from './telegram.js';
import MemoryEngine from './memory-engine.js';
import Scheduler from './scheduler.js';
import SkillsManager from './skills-manager.js';
import RetryPolicy from './retry-policy.js';
import HealthCheck from './health-check.js';
import UsageTracker from './usage-tracker.js';
import SessionManager from './session-manager.js';
import Logger from './logger.js';
import GitHubService from './github-service.js';
import TaskParser from './task-parser.js';

class Agent0 {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.telegram = new TelegramService();
    this.memory = new MemoryEngine();
    this.scheduler = new Scheduler();
    this.skills = new SkillsManager();
    this.retryPolicy = new RetryPolicy();
    this.healthCheck = new HealthCheck();
    this.usageTracker = new UsageTracker();
    this.sessionManager = new SessionManager();
    this.logger = new Logger({ level: 'info' });
    this.github = new GitHubService();
    this.taskParser = new TaskParser();

    this.identity = null;
    this.soul = null;
  }

  async initialize() {
    this.logger.info('Agent0 initializing...');

    // Load identity
    const identityData = await fs.readFile('agents/primary/identity.json', 'utf-8');
    this.identity = JSON.parse(identityData);

    // Load soul
    this.soul = await fs.readFile('agents/primary/soul.md', 'utf-8');

    // Initialize subsystems
    await this.scheduler.initialize();
    await this.skills.initialize();
    this.registerHealthChecks();

    this.logger.info(`Agent0 v${this.identity.version} ready`);
    this.logger.info(`Soul loaded (${this.soul.length} characters)`);
  }

  /**
   * Register health checks
   */
  registerHealthChecks() {
    this.healthCheck.register('system', async () => {
      return {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };
    }, { interval: 60000 });

    this.healthCheck.register('api', async () => {
      // Check if API key is available
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      return { status: 'healthy' };
    }, { interval: 60000, critical: true });
  }

  async think(message, conversationContext) {
    const prompt = `You are Agent0, an autonomous AI agent running on GitHub Actions.

**YOUR SOUL:**
${this.soul}

**CONVERSATION HISTORY:**
${conversationContext || 'No previous conversation'}

**CURRENT MESSAGE:**
User: ${message.text}

**INSTRUCTIONS:**
- Respond naturally and helpfully
- Remember you respond every 5 minutes (not in real-time)
- Be honest about your limitations
- Keep responses concise (under 300 words)
- Use your memory of past conversations

Respond now:`;

    this.logger.info('Thinking...');

    // Ensure we have model and max_tokens in identity
    const modelName = (this.identity && this.identity.model && this.identity.model.name) || 'gpt-4o-mini';
    const maxTokens = (this.identity && this.identity.model && this.identity.model.max_tokens) || 512;

    // Use retry policy for API calls
    const response = await this.retryPolicy.execute(async () => {
      return await this.openai.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
      });
    }, 'OpenAI API call');

    const responseText = response.choices[0].message.content;

    // Track usage
    const tokensUsed = response.usage?.total_tokens || 0;
    const estimatedCost = this.estimateCost(modelName, tokensUsed);
    this.usageTracker.track(modelName, tokensUsed, estimatedCost);

    this.logger.info(`Generated response (${responseText.length} chars, ${tokensUsed} tokens)`);

    return responseText;
  }

  /**
   * Estimate API cost based on model and tokens
   * Last updated: 2026-02-07
   * Pricing source: https://openai.com/api/pricing/
   */
  estimateCost(model, tokens) {
    // Cost estimates per 1k tokens (input + output averaged)
    const costPer1kTokens = {
      'gpt-4o-mini': 0.00015,
      'gpt-4o': 0.005,
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.0015
    };

    const rate = costPer1kTokens[model] || 0.0015;
    return (tokens / 1000) * rate;
  }

  async process() {
    try {
      console.log('🚀 Starting message processing...');
      
      // Initialize agent
      await this.initialize();
      
      // Load queue
      const queueData = await this.loadQueue();
      
      // Filter pending messages
      const pendingMessages = queueData.messages.filter(msg => msg.status === 'pending');
      
      if (pendingMessages.length === 0) {
        console.log('✅ No pending messages to process');
        return;
      }
      
      console.log(`📥 Processing ${pendingMessages.length} pending message(s)...`);
      
      // Process each message
      for (const message of pendingMessages) {
        try {
          await this.processMessage(message);
          
          // Update status in queue
          const msgIndex = queueData.messages.findIndex(m => m.update_id === message.update_id);
          if (msgIndex !== -1) {
            queueData.messages[msgIndex].status = 'processed';
            queueData.messages[msgIndex].processed_at = new Date().toISOString();
          }
        } catch (error) {
          console.error(`❌ Failed to process message ${message.message_id}:`, error.message);
          
          // Mark as failed
          const msgIndex = queueData.messages.findIndex(m => m.update_id === message.update_id);
          if (msgIndex !== -1) {
            queueData.messages[msgIndex].status = 'failed';
            queueData.messages[msgIndex].error = error.message;
          }
        }
      }
      
      // Save updated queue
      await this.saveQueue(queueData);
      
      // Update agent statistics
      const processedCount = queueData.messages.filter(m => m.status === 'processed').length;
      await this.updateStats(processedCount);
      
      console.log('✅ Message processing complete');
      
    } catch (error) {
      console.error('❌ Fatal error during message processing:', error);
      throw error;
    }
  }

  async processMessage(message) {
    try {
      console.log(`\n📨 Processing message from @${message.username} (${message.user_id})`);
      console.log(`   Text: "${message.text}"`);
      
      // Check if this is a PR creation request
      const taskInfo = this.taskParser.parse(message.text);
      
      if (taskInfo.isPRRequest && this.github.isAvailable()) {
        console.log('🔍 Detected PR creation request');
        await this.handlePRRequest(message, taskInfo);
        return;
      }
      
      // Load conversation history for this user
      const history = await this.memory.recall(message.user_id, 10);
      
      // Format conversation context
      let conversationContext = '';
      if (history.length > 0) {
        conversationContext = history.map(turn => 
          `User: ${turn.user}\nBot: ${turn.bot}`
        ).join('\n\n');
        console.log(`📚 Loaded ${history.length} previous conversation turn(s)`);
      } else {
        console.log('📚 No previous conversation history');
      }
      
      // Generate response using think()
      const response = await this.think(message, conversationContext);
      
      // Send response via Telegram
      await this.telegram.sendMessage(message.chat_id, response);
      console.log(`✅ Sent reply to @${message.username}`);
      
      // Save conversation to memory
      await this.memory.remember(message.user_id, message.text, response);
      console.log(`💾 Saved conversation for user ${message.user_id}`);
      
    } catch (error) {
      console.error(`❌ Error processing message:`, error);
      throw error;
    }
  }

  /**
   * Handle PR creation request from bot
   */
  async handlePRRequest(message, taskInfo) {
    try {
      console.log('🚀 Creating PR for task request...');
      
      // Validate task description
      if (!this.taskParser.isValidTask(taskInfo.taskDescription)) {
        const errorResponse = `I understand you want to create a PR, but the task description needs to be more specific. Please provide at least 10 characters describing what you want to implement.

Example: "Create a PR to add a health check endpoint that returns server status"`;
        
        await this.telegram.sendMessage(message.chat_id, errorResponse);
        await this.memory.remember(message.user_id, message.text, errorResponse);
        return;
      }

      // Create the PR
      const result = await this.github.createTaskPR({
        taskDescription: taskInfo.taskDescription,
        requestedBy: message.username || message.first_name,
        userId: message.user_id
      });

      // Send success response
      const successResponse = `✅ **PR Created Successfully!**

I've created a pull request for your task:

**Task:** ${taskInfo.taskDescription}
**PR:** [#${result.pr_number}](${result.pr_url})
**Branch:** \`${result.branch}\`

The PR is now ready for GitHub Copilot agents to work on. They will implement the task and push changes to the branch.

You can track progress at: ${result.pr_url}`;

      await this.telegram.sendMessage(message.chat_id, successResponse);
      
      // Save to memory
      await this.memory.remember(message.user_id, message.text, successResponse);
      
      console.log(`✅ PR #${result.pr_number} created successfully`);
      
    } catch (error) {
      console.error('❌ Failed to create PR:', error);
      
      let errorResponse = `❌ Sorry, I couldn't create the PR. `;
      
      if (!this.github.isAvailable()) {
        errorResponse += `GitHub integration is not properly configured. GITHUB_TOKEN may be missing.`;
      } else {
        errorResponse += `Error: ${error.message}`;
      }
      
      await this.telegram.sendMessage(message.chat_id, errorResponse);
      await this.memory.remember(message.user_id, message.text, errorResponse);
      
      throw error;
    }
  }

  async updateStats(messageCount) {
    try {
      console.log('📊 Updating agent statistics...');
      
      // Load current identity
      const identityData = await fs.readFile('agents/primary/identity.json', 'utf-8');
      const identity = JSON.parse(identityData);
      
      // Get memory summary for user count
      const memorySummary = await this.memory.getSummary();
      const uniqueUsers = memorySummary ? Object.keys(memorySummary.users).length : 0;
      
      // Update stats
      identity.stats.total_messages_processed = (identity.stats.total_messages_processed || 0) + messageCount;
      identity.stats.users_served = uniqueUsers;
      identity.stats.total_conversations = memorySummary ? memorySummary.total_conversations : 0;
      identity.last_updated = new Date().toISOString();
      
      // Save updated identity
      await fs.writeFile('agents/primary/identity.json', JSON.stringify(identity, null, 2));
      
      console.log(`✅ Stats updated: ${identity.stats.total_messages_processed} messages, ${identity.stats.users_served} users`);
      
    } catch (error) {
      console.error('❌ Error updating stats:', error);
      // Don't throw - stats update failure shouldn't break the whole process
    }
  }

  async loadQueue() {
    try {
      const data = await fs.readFile('queue/incoming.json', 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, return default structure
      return {
        last_update_id: 0,
        last_poll: null,
        messages: []
      };
    }
  }

  async saveQueue(queueData) {
    try {
      await fs.mkdir('queue', { recursive: true }).catch(() => {});
      await fs.writeFile('queue/incoming.json', JSON.stringify(queueData, null, 2));
      console.log('💾 Queue saved');
    } catch (error) {
      console.error('❌ Error saving queue:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive statistics
   */
  async getStatistics() {
    return {
      agent: {
        version: this.identity.version,
        uptime: process.uptime(),
        stats: this.identity.stats
      },
      usage: this.usageTracker.getSummary(),
      skills: this.skills.getStatistics(),
      sessions: this.sessionManager.getStats(),
      scheduler: this.scheduler.getStatus(),
      health: this.healthCheck.getLastResults()
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    this.logger.info('Shutting down Agent0...');
    
    // Stop scheduler
    this.scheduler.stop();
    
    // Cleanup old sessions
    this.sessionManager.cleanupOldSessions();
    
    this.logger.info('Shutdown complete');
  }
}

// CLI
const command = process.argv[2];

if (command === 'process') {
  const agent = new Agent0();
  agent.process().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
} else if (command === 'stats') {
  const agent = new Agent0();
  agent.initialize().then(async () => {
    const stats = await agent.getStatistics();
    console.log('\n📊 Agent0 Statistics:');
    console.log(JSON.stringify(stats, null, 2));
    await agent.shutdown();
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
} else {
  console.log('Usage: node agent.js [process|stats]');
  process.exit(1);
}

export default Agent0;
