import fs from 'fs/promises';
import path from 'path';

class MemoryEngine {
  constructor() {
    this.conversationsPath = 'memory/conversations';
    this.indexPath = 'memory/conversations/index.json';
  }

  /**
   * Store a conversation turn
   */
  async remember(userId, userMessage, botResponse) {
    const month = this.getCurrentMonth();
    const userFile = path.join(this.conversationsPath, month, `user-${userId}.json`);

    // Ensure directory exists
    await fs.mkdir(path.dirname(userFile), { recursive: true });

    // Load existing conversation
    let conversation;
    try {
      const data = await fs.readFile(userFile, 'utf-8');
      conversation = JSON.parse(data);
    } catch (error) {
      // New conversation
      conversation = {
        user_id: userId,
        started: new Date().toISOString(),
        history: []
      };
    }

    // Add turn
    conversation.history.push({
      timestamp: new Date().toISOString(),
      user: userMessage,
      bot: botResponse
    });

    // Keep last 100 turns
    if (conversation.history.length > 100) {
      conversation.history = conversation.history.slice(-100);
    }

    conversation.last_updated = new Date().toISOString();

    // Save
    await fs.writeFile(userFile, JSON.stringify(conversation, null, 2));

    // Update index
    await this.updateIndex(userId);

    console.log(`💾 Saved conversation turn for user ${userId}`);
  }

  /**
   * Recall conversation history for a user
   */
  async recall(userId, limit = 10) {
    const month = this.getCurrentMonth();
    const userFile = path.join(this.conversationsPath, month, `user-${userId}.json`);

    try {
      const data = await fs.readFile(userFile, 'utf-8');
      const conversation = JSON.parse(data);
      
      // Return last N turns
      return conversation.history.slice(-limit);
    } catch (error) {
      // No history found
      return [];
    }
  }

  /**
   * Search for relevant memories (simple keyword search for now)
   */
  async search(userId, query) {
    const history = await this.recall(userId, 50);
    const queryLower = query.toLowerCase();

    return history.filter(turn => 
      turn.user.toLowerCase().includes(queryLower) ||
      turn.bot.toLowerCase().includes(queryLower)
    ).slice(-5);
  }

  /**
   * Update conversation index
   */
  async updateIndex(userId) {
    let index;
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8');
      index = JSON.parse(data);
    } catch (error) {
      index = {
        version: '1.0.0',
        last_updated: null,
        total_conversations: 0,
        conversations: [],
        users: {},
        metadata: {}
      };
    }

    // Update user info
    if (!index.users[userId]) {
      index.users[userId] = {
        first_seen: new Date().toISOString(),
        message_count: 0
      };
      index.total_conversations++;
    }

    index.users[userId].message_count++;
    index.users[userId].last_seen = new Date().toISOString();
    index.last_updated = new Date().toISOString();

    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Get summary of all conversations
   */
  async getSummary() {
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  getCurrentMonth() {
    return new Date().toISOString().slice(0, 7); // "2026-02"
  }
}

export default MemoryEngine;
