import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

class MemoryEngine {
  constructor() {
    this.conversationsPath = 'memory/conversations';
    this.indexPath = 'memory/conversations/index.json';
    this.embeddingsPath = 'memory/embeddings';
    this.sessionsPath = 'memory/sessions';

    // Initialize OpenAI for embeddings (only if API key is available)
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;

    this.embeddingModel = 'text-embedding-3-small';

    // Session configuration
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.sessionContextWindow = 20; // Last 20 messages in active session
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
    const turn = {
      timestamp: new Date().toISOString(),
      user: userMessage,
      bot: botResponse
    };
    
    conversation.history.push(turn);

    // Keep last 100 turns
    if (conversation.history.length > 100) {
      conversation.history = conversation.history.slice(-100);
    }

    conversation.last_updated = new Date().toISOString();

    // Save
    await fs.writeFile(userFile, JSON.stringify(conversation, null, 2));

    // Generate and store embedding for semantic search (if OpenAI is available)
    if (this.openai) {
      try {
        await this.generateAndStoreEmbedding(userId, turn, conversation.history.length - 1);
      } catch (error) {
        console.error('Failed to generate embedding:', error.message);
        // Don't fail the entire remember operation if embedding fails
      }
    }

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

  /**
   * Generate embedding for a conversation turn using OpenAI
   */
  async generateEmbedding(text) {
    if (!this.openai) {
      throw new Error('OpenAI not initialized - API key required for embeddings');
    }

    const response = await this.openai.embeddings.create({
      model: this.embeddingModel,
      input: text
    });

    return response.data[0].embedding;
  }

  /**
   * Generate and store embedding for a conversation turn
   */
  async generateAndStoreEmbedding(userId, turn, turnIndex) {
    const month = this.getCurrentMonth();
    const embeddingFile = path.join(this.embeddingsPath, month, `user-${userId}.json`);

    // Create combined text for embedding (user + bot for context)
    const combinedText = `User: ${turn.user}\nBot: ${turn.bot}`;
    
    // Generate embedding
    const embedding = await this.generateEmbedding(combinedText);

    // Ensure directory exists
    await fs.mkdir(path.dirname(embeddingFile), { recursive: true });

    // Load or create embeddings file
    let embeddingsData;
    try {
      const data = await fs.readFile(embeddingFile, 'utf-8');
      embeddingsData = JSON.parse(data);
    } catch (error) {
      embeddingsData = {
        user_id: userId,
        embeddings: []
      };
    }

    // Add embedding
    embeddingsData.embeddings.push({
      index: turnIndex,
      timestamp: turn.timestamp,
      embedding: embedding
    });

    // Keep last 100 embeddings to match conversation history
    if (embeddingsData.embeddings.length > 100) {
      embeddingsData.embeddings = embeddingsData.embeddings.slice(-100);
    }

    // Save
    await fs.writeFile(embeddingFile, JSON.stringify(embeddingsData, null, 2));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Semantic search using vector embeddings
   * Returns conversation turns most semantically similar to the query
   */
  async semanticSearch(userId, query, options = {}) {
    const limit = options.limit || 5;
    const minSimilarity = options.minSimilarity || 0.7;

    if (!this.openai) {
      console.warn('Semantic search requires OpenAI API key, falling back to keyword search');
      return this.search(userId, query, options);
    }

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Load stored embeddings
      const month = this.getCurrentMonth();
      const embeddingFile = path.join(this.embeddingsPath, month, `user-${userId}.json`);

      let embeddingsData;
      try {
        const data = await fs.readFile(embeddingFile, 'utf-8');
        embeddingsData = JSON.parse(data);
      } catch (error) {
        // No embeddings found, return empty results
        return [];
      }

      // Load conversation history
      const history = await this.recall(userId, 100);

      // Calculate similarity scores
      const scored = embeddingsData.embeddings.map(item => {
        const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);
        const turn = history[item.index];

        return {
          turn,
          similarity,
          timestamp: item.timestamp
        };
      }).filter(item => item.turn); // Filter out any missing turns

      // Sort by similarity and return top results
      return scored
        .filter(item => item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => ({
          ...item.turn,
          similarity: item.similarity
        }));

    } catch (error) {
      console.error('Semantic search failed:', error.message);
      // Fall back to keyword search
      return this.search(userId, query, options);
    }
  }

  /**
   * Get or create active session for a user
   * Sessions help maintain context in ongoing conversations
   */
  async getSession(userId) {
    const sessionFile = path.join(this.sessionsPath, `user-${userId}.json`);

    try {
      const data = await fs.readFile(sessionFile, 'utf-8');
      const session = JSON.parse(data);

      // Check if session is still active (within timeout)
      const lastActivity = new Date(session.last_activity);
      const now = new Date();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity > this.sessionTimeout) {
        // Session expired, create new one
        console.log(`⏰ Session expired for user ${userId}, creating new session`);
        return this.createNewSession(userId);
      }

      return session;
    } catch (error) {
      // No session found, create new one
      return this.createNewSession(userId);
    }
  }

  /**
   * Create a new session for a user
   */
  async createNewSession(userId) {
    const session = {
      user_id: userId,
      session_id: `${userId}-${Date.now()}`,
      created: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      context: [],
      summary: null
    };

    await this.saveSession(session);
    console.log(`✨ Created new session for user ${userId}`);
    return session;
  }

  /**
   * Update session with new conversation turn
   */
  async updateSession(userId, userMessage, botResponse) {
    const session = await this.getSession(userId);

    // Add turn to session context
    session.context.push({
      timestamp: new Date().toISOString(),
      user: userMessage,
      bot: botResponse
    });

    // Keep only recent messages within context window
    if (session.context.length > this.sessionContextWindow) {
      session.context = session.context.slice(-this.sessionContextWindow);
    }

    session.last_activity = new Date().toISOString();

    await this.saveSession(session);
    return session;
  }

  /**
   * Save session to disk
   */
  async saveSession(session) {
    const sessionFile = path.join(this.sessionsPath, `user-${session.user_id}.json`);

    // Ensure directory exists
    await fs.mkdir(path.dirname(sessionFile), { recursive: true });

    await fs.writeFile(sessionFile, JSON.stringify(session, null, 2));
  }

  /**
   * Get session context formatted for AI consumption
   */
  async getSessionContext(userId) {
    const session = await this.getSession(userId);

    if (session.context.length === 0) {
      return "No active session context.";
    }

    const contextString = session.context
      .map(turn => `User: ${turn.user}\nBot: ${turn.bot}`)
      .join('\n\n');

    return `Active session context (${session.context.length} messages):\n\n${contextString}`;
  }

  /**
   * Clear session for a user
   */
  async clearSession(userId) {
    const sessionFile = path.join(this.sessionsPath, `user-${userId}.json`);

    try {
      await fs.unlink(sessionFile);
      console.log(`🗑️  Cleared session for user ${userId}`);
      return true;
    } catch (error) {
      // Session file doesn't exist
      return false;
    }
  }

  /**
   * Get combined context: session + relevant long-term memory
   */
  async getCombinedContext(userId, query = null, options = {}) {
    const sessionContext = await this.getSessionContext(userId);

    // If no query provided, return only session context
    if (!query) {
      return sessionContext;
    }

    // Get relevant memories from long-term storage
    const relevantMemories = await this.search(userId, query, {
      limit: options.memoryLimit || 5,
      minScore: options.minScore || 0.5
    });

    if (relevantMemories.length === 0) {
      return sessionContext;
    }

    const memoriesString = relevantMemories
      .map(turn => `[${turn.timestamp}]\nUser: ${turn.user}\nBot: ${turn.bot}`)
      .join('\n\n');

    return `${sessionContext}\n\n--- Relevant Past Conversations ---\n\n${memoriesString}`;
  }
}

export default MemoryEngine;
