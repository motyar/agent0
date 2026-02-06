#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import TelegramService from './telegram.js';
import MemoryEngine from './memory-engine.js';

class Agent0 {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
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

  async process() {
    await this.initialize();
    
    // Load queue
    const queueData = await fs.readFile('queue/incoming.json', 'utf-8');
    const queue = JSON.parse(queueData);
    
    if (queue.messages.length === 0) {
      console.log('📭 No messages to process');
      return;
    }
    
    console.log(`📬 Processing ${queue.messages.length} messages...`);
    
    for (const message of queue.messages) {
      await this.processMessage(message);
    }
    
    // Clear queue
    queue.messages = [];
    await fs.writeFile('queue/incoming.json', JSON.stringify(queue, null, 2));
    
    // Update stats
    await this.updateStats();
  }

  async processMessage(message) {
    console.log(`\n💬 Processing message from ${message.username} (${message.user_id})`);
    console.log(`📝 Message: ${message.text}`);
    
    try {
      // Recall conversation history
      const history = await this.memory.recall(message.user_id, 5);
      console.log(`🧠 Recalled ${history.length} previous turns`);
      
      // Build context
      const conversationContext = history.map(turn => 
        `User: ${turn.user}\nAssistant: ${turn.bot}`
      ).join('\n\n');
      
      // Think and respond
      const response = await this.think(message, conversationContext);
      
      // Send to Telegram
      await this.telegram.sendMessage(message.chat_id, response);
      
      // Remember this interaction
      await this.memory.remember(message.user_id, message.text, response);
      
      console.log(`✅ Responded successfully`);
      
    } catch (error) {
      console.error(`❌ Error processing message:`, error.message);
      
      // Send error message to user
      try {
        await this.telegram.sendMessage(
          message.chat_id,
          `Sorry, I encountered an error processing your message. I'll try to do better next time! 🤖`
        );
      } catch (sendError) {
        console.error(`❌ Failed to send error message:`, sendError.message);
      }
    }
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
    
    const response = await this.anthropic.messages.create({
      model: this.identity.model.name,
      max_tokens: this.identity.model.max_tokens,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const responseText = response.content[0].text;
    console.log(`💭 Generated response (${responseText.length} chars)`);
    
    return responseText;
  }

  async updateStats() {
    this.identity.stats.total_messages_processed += 1;
    this.identity.last_updated = new Date().toISOString();
    
    const summary = await this.memory.getSummary();
    if (summary) {
      this.identity.stats.total_conversations = summary.total_conversations;
      this.identity.stats.users_served = Object.keys(summary.users).length;
    }
    
    await fs.writeFile(
      'agents/primary/identity.json',
      JSON.stringify(this.identity, null, 2)
    );
    
    console.log('📊 Stats updated');
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
