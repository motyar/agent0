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
   * Search for relevant memories (enhanced keyword and semantic search)
   */
  async search(userId, query, options = {}) {
    const limit = options.limit || 50;
    const minScore = options.minScore || 0.3;
    
    const history = await this.recall(userId, limit);
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    // Score each turn based on relevance
    const scored = history.map(turn => {
      let score = 0;
      const userLower = turn.user.toLowerCase();
      const botLower = turn.bot.toLowerCase();
      
      // Exact phrase match (highest score)
      if (userLower.includes(queryLower) || botLower.includes(queryLower)) {
        score += 1.0;
      }
      
      // Word matches
      for (const word of queryWords) {
        if (userLower.includes(word)) score += 0.3;
        if (botLower.includes(word)) score += 0.2;
      }
      
      return { turn, score };
    });
    
    // Filter by minimum score and sort by relevance
    return scored
      .filter(item => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.turn);
  }

  /**
   * Summarize conversation history for a user
   */
  async summarize(userId, options = {}) {
    const limit = options.limit || 100;
    const history = await this.recall(userId, limit);
    
    if (history.length === 0) {
      return {
        user_id: userId,
        message_count: 0,
        summary: 'No conversation history',
        topics: [],
        sentiment: 'neutral'
      };
    }
    
    // Extract topics (simple keyword extraction)
    const topics = this.extractTopics(history);
    
    // Analyze sentiment (basic)
    const sentiment = this.analyzeSentiment(history);
    
    // Get time range
    const firstMessage = history[0].timestamp;
    const lastMessage = history[history.length - 1].timestamp;
    
    return {
      user_id: userId,
      message_count: history.length,
      first_interaction: firstMessage,
      last_interaction: lastMessage,
      topics: topics.slice(0, 10),
      sentiment,
      summary: this.generateTextSummary(history, topics)
    };
  }

  /**
   * Extract topics from conversation history
   */
  extractTopics(history) {
    const wordFreq = {};
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that', 'from', 'was', 'are', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'when', 'where', 'who', 'why', 'how']);
    
    for (const turn of history) {
      const words = turn.user.toLowerCase().match(/\b\w+\b/g) || [];
      for (const word of words) {
        if (word.length > 3 && !stopWords.has(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      }
    }
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([word, freq]) => ({ word, frequency: freq }));
  }

  /**
   * Analyze sentiment of conversations
   */
  analyzeSentiment(history) {
    let positiveCount = 0;
    let negativeCount = 0;
    
    const positiveWords = ['good', 'great', 'thanks', 'thank', 'awesome', 'excellent', 'love', 'like', 'yes', 'perfect', 'nice'];
    const negativeWords = ['bad', 'wrong', 'error', 'problem', 'issue', 'no', 'not', 'dont', 'cant', 'fail'];
    
    for (const turn of history) {
      const textLower = turn.user.toLowerCase();
      
      for (const word of positiveWords) {
        if (textLower.includes(word)) positiveCount++;
      }
      
      for (const word of negativeWords) {
        if (textLower.includes(word)) negativeCount++;
      }
    }
    
    if (positiveCount > negativeCount * 1.5) return 'positive';
    if (negativeCount > positiveCount * 1.5) return 'negative';
    return 'neutral';
  }

  /**
   * Generate text summary
   */
  generateTextSummary(history, topics) {
    const messageCount = history.length;
    const topTopics = topics.slice(0, 3).map(t => t.word).join(', ');
    
    return `Conversation with ${messageCount} messages. Main topics: ${topTopics || 'general discussion'}.`;
  }

  /**
   * Get all conversations for a specific time period
   */
  async getConversationsByPeriod(startDate, endDate) {
    const conversations = [];
    
    // Generate list of months to check
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = [];
    
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      months.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }
    
    // Load conversations from each month
    for (const month of months) {
      try {
        const monthPath = path.join(this.conversationsPath, month);
        const files = await fs.readdir(monthPath);
        
        for (const file of files) {
          if (file.startsWith('user-') && file.endsWith('.json')) {
            const filePath = path.join(monthPath, file);
            const data = await fs.readFile(filePath, 'utf-8');
            const conversation = JSON.parse(data);
            
            // Filter by date range
            const filtered = conversation.history.filter(turn => {
              const turnDate = new Date(turn.timestamp);
              return turnDate >= start && turnDate <= end;
            });
            
            if (filtered.length > 0) {
              conversations.push({
                user_id: conversation.user_id,
                turns: filtered
              });
            }
          }
        }
      } catch (error) {
        // Month directory might not exist
        continue;
      }
    }
    
    return conversations;
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
