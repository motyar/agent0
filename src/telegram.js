#!/usr/bin/env node

import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs/promises';

class TelegramService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!this.token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
    }
    
    // Don't use polling in bot initialization - we'll manually call getUpdates
    this.bot = new TelegramBot(this.token, { polling: false });
    this.queuePath = 'queue/incoming.json';
  }

  async poll() {
    try {
      // Load last update ID from queue
      const queueData = await this.loadQueue();
      const offset = queueData.last_update_id + 1;

      console.log(`📡 Polling Telegram... (offset: ${offset})`);

      // Get updates from Telegram
      const updates = await this.bot.getUpdates({
        offset: offset,
        timeout: 30,
        allowed_updates: ['message']
      });

      console.log(`📨 Received ${updates.length} updates`);

      if (updates.length === 0) {
        return {
          messages: [],
          last_update_id: queueData.last_update_id,
          last_poll: new Date().toISOString()
        };
      }

      // Process updates into messages
      const messages = [];
      let lastUpdateId = queueData.last_update_id;

      for (const update of updates) {
        if (update.message && update.message.text) {
          messages.push({
            update_id: update.update_id,
            message_id: update.message.message_id,
            user_id: update.message.from.id,
            username: update.message.from.username || update.message.from.first_name,
            first_name: update.message.from.first_name,
            text: update.message.text,
            timestamp: new Date(update.message.date * 1000).toISOString(),
            chat_id: update.message.chat.id,
            status: 'pending'
          });
          
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
        }
      }

      // Save to queue
      const result = {
        last_update_id: lastUpdateId,
        last_poll: new Date().toISOString(),
        messages: messages
      };

      await this.saveQueue(result);

      console.log(`✅ Queued ${messages.length} messages`);
      console.log(JSON.stringify(result, null, 2));

      return result;

    } catch (error) {
      console.error('❌ Telegram polling error:', error.message);
      throw error;
    }
  }

  async sendMessage(chatId, text, options = {}) {
    try {
      console.log(`📤 Sending message to chat ${chatId}`);
      const result = await this.bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        ...options
      });
      console.log(`✅ Message sent successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send message:`, error.message);
      throw error;
    }
  }

  async loadQueue() {
    try {
      const data = await fs.readFile(this.queuePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, return default
      return {
        last_update_id: 0,
        last_poll: null,
        messages: []
      };
    }
  }

  async saveQueue(data) {
    await fs.writeFile(this.queuePath, JSON.stringify(data, null, 2));
  }

  async getMe() {
    return await this.bot.getMe();
  }
}

// CLI interface
const command = process.argv[2];

if (command === 'poll') {
  const telegram = new TelegramService();
  telegram.poll().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
} else if (command === 'info') {
  const telegram = new TelegramService();
  telegram.getMe().then(me => {
    console.log('🤖 Bot info:', JSON.stringify(me, null, 2));
  }).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} else {
  console.log('Usage: node telegram.js [poll|info]');
  process.exit(1);
}

export default TelegramService;
