#!/usr/bin/env node

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import TelegramService from './telegram.js';
import MemoryEngine from './memory-engine.js';
import Scheduler from './scheduler.js';
import SkillsManager from './skills-manager.js';
import SkillManager from './skillManager.js';
import RetryPolicy from './retry-policy.js';
import Monitor from './monitor.js';
import SessionManager from './session-manager.js';
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
    this.skillManager = new SkillManager('./skills');
    this.retryPolicy = new RetryPolicy();
    this.monitor = new Monitor({ level: 'info' });
    this.sessionManager = new SessionManager();
    this.github = new GitHubService();
    this.taskParser = new TaskParser();

    this.identity = null;
    this.soul = null;
    this.skillsContext = '';
  }

  async initialize() {
    this.monitor.info('Agent0 initializing...');

    // Load identity
    const identityData = await fs.readFile('agents/primary/identity.json', 'utf-8');
    this.identity = JSON.parse(identityData);

    // Load soul
    this.soul = await fs.readFile('agents/primary/soul.md', 'utf-8');

    // Initialize subsystems
    await this.scheduler.initialize();
    await this.skills.initialize();
    
    // Initialize Skills.sh integration
    await this.skillManager.ensureDirectories();
    this.skillsContext = await this.skillManager.getSkillsContext();
    
    this.registerHealthChecks();

    this.monitor.info(`Agent0 v${this.identity.version} ready`);
    this.monitor.info(`Soul loaded (${this.soul.length} characters)`);
    
    if (this.skillsContext) {
      this.monitor.info(`Skills.sh integration loaded (${this.skillsContext.length} characters)`);
    }
  }

  /**
   * Register health checks
   */
  registerHealthChecks() {
    this.monitor.register('system', async () => {
      return {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };
    }, { interval: 60000 });

    this.monitor.register('api', async () => {
      // Check if API key is available
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      return { status: 'healthy' };
    }, { interval: 60000, critical: true });
  }

  async think(message, conversationContext) {
    const skillsSection = this.skillsContext 
      ? `\n**AVAILABLE SKILLS FROM Skills.sh:**\n${this.skillsContext}\n\nYou can use these skills to enhance your responses and capabilities.\n` 
      : '';
    
    const prompt = `You are Agent0, an autonomous AI agent running on GitHub Actions.

**YOUR SOUL:**
${this.soul}
${skillsSection}
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

    this.monitor.info('Thinking...');

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
    this.monitor.track(modelName, tokensUsed, estimatedCost);

    this.monitor.info(`Generated response (${responseText.length} chars, ${tokensUsed} tokens)`);

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
      
      // Check for skill management commands
      if (message.text.startsWith('/skill_add ')) {
        await this.handleSkillAdd(message);
        return;
      }
      
      if (message.text === '/skill_list') {
        await this.handleSkillList(message);
        return;
      }
      
      if (message.text.startsWith('/skill_remove ')) {
        await this.handleSkillRemove(message);
        return;
      }
      
      if (message.text === '/skills_help') {
        await this.handleSkillsHelp(message);
        return;
      }
      
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

  /**
   * Handle /skill_add command
   */
  async handleSkillAdd(message) {
    try {
      const args = message.text.split(' ');
      if (args.length < 2) {
        const response = 'Usage: /skill_add owner/repo\n\nExample: /skill_add username/my-skill\n\nBrowse available skills at https://skills.sh';
        await this.telegram.sendMessage(message.chat_id, response);
        await this.memory.remember(message.user_id, message.text, response);
        return;
      }
      
      const skillRepo = args[1];
      
      // Validate format before processing (basic check)
      const validPattern = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
      if (!validPattern.test(skillRepo)) {
        const response = '❌ Invalid repository format. Use: owner/repo\n\nExample: /skill_add username/my-skill';
        await this.telegram.sendMessage(message.chat_id, response);
        await this.memory.remember(message.user_id, message.text, response);
        return;
      }
      
      await this.telegram.sendMessage(message.chat_id, `📦 Installing skill: ${skillRepo}...`);
      
      const success = await this.skillManager.installSkill(skillRepo);
      
      let response;
      if (success) {
        // Reload skills context
        this.skillsContext = await this.skillManager.getSkillsContext();
        response = `✅ Skill ${skillRepo} installed successfully!\n\nThe skill is now available and has been loaded into my context.`;
      } else {
        response = `❌ Failed to install skill. The repository may not exist or the skill format is invalid.`;
      }
      
      await this.telegram.sendMessage(message.chat_id, response);
      await this.memory.remember(message.user_id, message.text, response);
      
    } catch (error) {
      console.error('❌ Error in handleSkillAdd:', error);
      const response = `❌ Error installing skill: ${error.message}`;
      await this.telegram.sendMessage(message.chat_id, response);
      await this.memory.remember(message.user_id, message.text, response);
    }
  }

  /**
   * Handle /skill_list command
   */
  async handleSkillList(message) {
    try {
      const skills = await this.skillManager.listSkills();
      
      let response;
      if (skills.length === 0) {
        response = 'No Skills.sh skills installed yet.\n\nUse /skill_add to install skills from Skills.sh.\n\nExample: /skill_add vercel/code-review';
      } else {
        const list = skills.map(s => `• ${s.name} (${s.type})`).join('\n');
        response = `📚 **Installed Skills.sh Skills:**\n\n${list}\n\nTotal: ${skills.length} skill(s)`;
      }
      
      await this.telegram.sendMessage(message.chat_id, response);
      await this.memory.remember(message.user_id, message.text, response);
      
    } catch (error) {
      console.error('❌ Error in handleSkillList:', error);
      const response = `❌ Error listing skills: ${error.message}`;
      await this.telegram.sendMessage(message.chat_id, response);
      await this.memory.remember(message.user_id, message.text, response);
    }
  }

  /**
   * Handle /skill_remove command
   */
  async handleSkillRemove(message) {
    try {
      const args = message.text.split(' ');
      if (args.length < 2) {
        const response = 'Usage: /skill_remove skill-name.md\n\nExample: /skill_remove code-review.md';
        await this.telegram.sendMessage(message.chat_id, response);
        await this.memory.remember(message.user_id, message.text, response);
        return;
      }
      
      const skillName = args[1];
      
      const success = await this.skillManager.removeSkill(skillName);
      
      let response;
      if (success) {
        // Reload skills context
        this.skillsContext = await this.skillManager.getSkillsContext();
        response = `✅ Skill ${skillName} removed successfully!`;
      } else {
        response = `❌ Failed to remove skill.`;
      }
      
      await this.telegram.sendMessage(message.chat_id, response);
      await this.memory.remember(message.user_id, message.text, response);
      
    } catch (error) {
      console.error('❌ Error in handleSkillRemove:', error);
      const response = `❌ Error removing skill: ${error.message}`;
      await this.telegram.sendMessage(message.chat_id, response);
      await this.memory.remember(message.user_id, message.text, response);
    }
  }

  /**
   * Handle /skills_help command
   */
  async handleSkillsHelp(message) {
    try {
      const response = `📚 **Skills.sh Management Commands**

/skill_add owner/repo - Install a skill from Skills.sh
/skill_list - List all installed skills
/skill_remove name.md - Remove an installed skill
/skills_help - Show this help message

**Examples:**
\`/skill_add username/my-skill\`
\`/skill_list\`
\`/skill_remove my-skill.md\`

**About Skills.sh:**
Skills.sh is an open directory for AI agent skills - modular packages that extend agent capabilities. Skills are packaged as SKILL.md files with instructions and best practices.

Browse available skills and learn more at https://skills.sh`;
      
      await this.telegram.sendMessage(message.chat_id, response);
      await this.memory.remember(message.user_id, message.text, response);
      
    } catch (error) {
      console.error('❌ Error in handleSkillsHelp:', error);
      const response = `❌ Error showing help: ${error.message}`;
      await this.telegram.sendMessage(message.chat_id, response);
      await this.memory.remember(message.user_id, message.text, response);
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
      usage: this.monitor.getSummary(),
      skills: this.skills.getStatistics(),
      sessions: this.sessionManager.getStats(),
      scheduler: this.scheduler.getStatus(),
      health: this.monitor.getLastResults()
    };
  }

  /**
   * Process a PR by fetching task details and implementing the task
   */
  async processPR(prNumber) {
    try {
      // Dynamic import for Octokit since we're in ES module
      const { Octokit } = await import('@octokit/rest');
      
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
      
      console.log(`📋 Fetching PR #${prNumber}...`);
      
      // Get PR details
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      });
      
      // Extract task from PR body
      const taskMatch = pr.body.match(/\*\*Task:\*\* (.+)/);
      const task = taskMatch ? taskMatch[1] : process.env.TASK_DESCRIPTION || '';
      
      if (!task) {
        throw new Error('Could not extract task description from PR body');
      }
      
      console.log(`🎯 Task: ${task}`);
      
      // Use OpenAI to process the task
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are Agent0, an autonomous coding agent. Given a task description, you need to:
1. Analyze what needs to be done
2. Determine which files to create or modify
3. Generate the necessary code or content
4. Provide the implementation as a structured response

Respond in JSON format:
{
  "analysis": "brief analysis of the task",
  "files": [
    {
      "path": "file/path.ext",
      "action": "create|modify",
      "content": "file content"
    }
  ]
}

IMPORTANT: All file paths must be relative to the repository root and must not contain path traversal sequences (../).`
            },
            {
              role: 'user',
              content: `Task: ${task}\n\nRepository: ${owner}/${repo}\nBranch: ${pr.head.ref}`
            }
          ],
          temperature: 0.7
        })
      });
      
      const result = await response.json();
      
      if (!result.choices || !result.choices[0]) {
        throw new Error('Invalid response from OpenAI API');
      }
      
      let implementation;
      try {
        implementation = JSON.parse(result.choices[0].message.content);
      } catch (parseError) {
        throw new Error('Failed to parse AI response as JSON. Response may be malformed.');
      }
      
      console.log(`💡 Analysis: ${implementation.analysis}`);
      console.log(`📝 Will process ${implementation.files.length} file(s)`);
      
      // Get repository root path
      const repoRoot = process.cwd();
      
      // Implement the changes
      for (const file of implementation.files) {
        // Validate file path to prevent path traversal attacks
        const filePath = path.join(repoRoot, file.path);
        const resolvedPath = path.resolve(filePath);
        
        // Ensure the resolved path is within the repository root
        if (!resolvedPath.startsWith(repoRoot)) {
          console.error(`⚠️ Skipping ${file.path}: Path traversal detected`);
          continue;
        }
        
        console.log(`${file.action === 'create' ? '➕' : '✏️'} ${file.path}`);
        
        const dir = path.dirname(filePath);
        
        // Ensure directory exists
        await fs.mkdir(dir, { recursive: true });
        
        // Write the file
        await fs.writeFile(filePath, file.content, 'utf8');
      }
      
      console.log('✅ Task implementation complete!');
      
      return { success: true, task, implementation };
      
    } catch (error) {
      console.error('❌ Error processing PR:', error);
      throw error;
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    this.monitor.info('Shutting down Agent0...');
    
    // Stop scheduler
    this.scheduler.stop();
    
    // Cleanup old sessions
    this.sessionManager.cleanupOldSessions();
    
    this.monitor.info('Shutdown complete');
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
} else if (command === 'process-pr') {
  const prNumber = parseInt(process.argv[3]);
  
  if (!prNumber || isNaN(prNumber)) {
    console.error('❌ Error: PR number is required');
    console.log('Usage: node agent.js process-pr <pr-number>');
    process.exit(1);
  }
  
  const agent = new Agent0();
  agent.initialize()
    .then(() => agent.processPR(prNumber))
    .then(() => {
      console.log('✅ PR processed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error processing PR:', error);
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
  console.log('Usage: node agent.js [process|process-pr <pr-number>|stats]');
  process.exit(1);
}

export default Agent0;
