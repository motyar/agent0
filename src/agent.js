#!/usr/bin/env node

import OpenAI from 'openai';
import fs from 'fs/promises';
import TelegramService from './telegram.js';
import MemoryEngine from './memory-engine.js';

class Agent0 {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.telegram = new TelegramService();
    this.memory = new MemoryEngine();

    this.identity = null;
    this.soul = null;
  }

  async initialize() {
    console.log('🤖 Agent0 initializing...');

    // Load identity
    const identityData = await fs.readFile('agents/primary/identity.json', 'utf-8');
    this.identity = JSON.parse(identityData);

    // Load soul
    this.soul = await fs.readFile('agents/primary/soul.md', 'utf-8');

    console.log(`✅ Agent0 v${this.identity.version} ready`);
    console.log(`📖 Soul loaded (${this.soul.length} characters)`);
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

    console.log('🧠 Thinking...');

    // Ensure we have model and max_tokens in identity
    const modelName = (this.identity && this.identity.model && this.identity.model.name) || 'gpt-4o-mini';
    const maxTokens = (this.identity && this.identity.model && this.identity.model.max_tokens) || 512;

    // Use OpenAI Chat Completions API
    const response = await this.openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens
    });

    const responseText = response.choices[0].message.content;

    console.log(`💭 Generated response (${responseText.length} chars)`);

    return responseText;
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
}

// CLI
const command = process.argv[2];

if (command === 'process') {
  const agent = new Agent0();
  agent.process().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
} else {
  console.log('Usage: node agent.js process');
  process.exit(1);
}

export default Agent0;
