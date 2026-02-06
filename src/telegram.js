#!/usr/bin/env node

import fs from 'fs/promises';

class TelegramService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!this.token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
    }
    
    this.queuePath = 'queue/incoming.json';
  }

  async api(method, body = {}) {
    const url = `https://api.telegram.org/bot${this.token}/${method}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    let payload;
    try {
      payload = await res.json();
    } catch (err) {
      throw new Error(`Invalid JSON response from Telegram API (HTTP ${res.status})`);
    }

    if (!res.ok || payload.ok === false) {
      const errMsg = payload && payload.description ? payload.description : `HTTP ${res.status}`;
      throw new Error(`Telegram API error: ${errMsg}`);
    }

    return payload.result;
  }

  async poll() {
    try {
      // Load last update ID from queue
      const queueData = await this.loadQueue();
      const offset = queueData.last_update_id + 1;

      console.error(`📡 Polling Telegram... (offset: ${offset})`);

      // Get updates from Telegram (use getUpdates via POST)
      const updates = await this.api('getUpdates', {
        offset: offset,
        timeout: 30,
        allowed_updates: ['message']
      });

      console.error(`📨 Received ${Array.isArray(updates) ? updates.length : 0} updates`);

      if (!Array.isArray(updates) || updates.length === 0) {
        const resultNoUpdates = {
          messages: [],
          last_update_id: queueData.last_update_id,
          last_poll: new Date().toISOString()
        };
        // Output only JSON to stdout for machine consumption
        console.log(JSON.stringify(resultNoUpdates));
        return resultNoUpdates;
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

      console.error(`✅ Queued ${messages.length} messages`);
      // Output only JSON to stdout for machine consumption
      console.log(JSON.stringify(result));
      return result;

    } catch (error) {
      console.error('❌ Telegram polling error:', error.message || error);
      throw error;
    }
  }

  async sendMessage(chatId, text, options = {}) {
    try {
      console.error(`📤 Sending message to chat ${chatId}`);

      const body = {
        chat_id: chatId,
        text: String(text),
        // default to Markdown if not provided
        ...(options.parse_mode ? { parse_mode: options.parse_mode } : { parse_mode: 'Markdown' }),
        ...(options.reply_to_message_id ? { reply_to_message_id: options.reply_to_message_id } : {}),
        ...(options.disable_web_page_preview ? { disable_web_page_preview: options.disable_web_page_preview } : {}),
        ...(options.disable_notification ? { disable_notification: options.disable_notification } : {})
      };

      const result = await this.api('sendMessage', body);

      console.error(`✅ Message sent successfully (message_id=${result.message_id})`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send message:`, error.message || error);
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
    await fs.mkdir('queue', { recursive: true }).catch(() => {});
    await fs.writeFile(this.queuePath, JSON.stringify(data, null, 2));
  }

  async getMe() {
    try {
      return await this.api('getMe', {});
    } catch (error) {
      console.error('❌ getMe error:', error.message || error);
      throw error;
    }
  }
}

// Only run CLI code if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
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
      console.log(JSON.stringify(me, null, 2));
    }).catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
  } else {
    console.log('Usage: node telegram.js [poll|info]');
    process.exit(1);
  }
}

export default TelegramService;
