/**
 * Session Manager - Automatic context management and pruning
 */
class SessionManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.maxContextLength = options.maxContextLength || 10000;
    this.pruneThreshold = options.pruneThreshold || 0.8; // 80% of max
    this.prunePercent = options.prunePercent || 0.3; // Remove 30% when pruning
  }

  /**
   * Get or create a session
   */
  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        context: [],
        totalTokens: 0,
        created: new Date().toISOString(),
        lastAccess: new Date().toISOString()
      });
    }
    
    const session = this.sessions.get(sessionId);
    session.lastAccess = new Date().toISOString();
    
    return session;
  }

  /**
   * Add message to session context
   */
  addMessage(sessionId, message, tokens) {
    const session = this.getSession(sessionId);
    
    session.context.push({
      ...message,
      tokens,
      timestamp: new Date().toISOString()
    });
    
    session.totalTokens += tokens;
    
    // Check if pruning is needed
    if (session.totalTokens > this.maxContextLength * this.pruneThreshold) {
      this.pruneSession(sessionId);
    }
  }

  /**
   * Prune session context
   */
  pruneSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) return;
    
    console.log(`✂️  Pruning session ${sessionId}...`);
    
    // Calculate target tokens to remove (prune by token count, not message count)
    const targetTokensToRemove = Math.floor(session.totalTokens * this.prunePercent);
    
    if (targetTokensToRemove > 0) {
      const removed = [];
      let removedTokens = 0;
      
      // Remove oldest messages (keep system messages) until we reach target
      for (let i = 0; i < session.context.length && removedTokens < targetTokensToRemove; i++) {
        if (session.context[i].role !== 'system') {
          removed.push(i);
          removedTokens += session.context[i].tokens || 0;
        }
      }
      
      // Remove in reverse order to maintain indices
      for (let i = removed.length - 1; i >= 0; i--) {
        session.context.splice(removed[i], 1);
      }
      
      session.totalTokens -= removedTokens;
      
      console.log(`✅ Pruned ${removed.length} messages (${removedTokens} tokens) from session ${sessionId}`);
    }
  }

  /**
   * Get session context
   */
  getContext(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.context : [];
  }

  /**
   * Clear session
   */
  clearSession(sessionId) {
    this.sessions.delete(sessionId);
    console.log(`✅ Cleared session ${sessionId}`);
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      total_sessions: this.sessions.size,
      sessions: Array.from(this.sessions.values()).map(s => ({
        id: s.id,
        messages: s.context.length,
        tokens: s.totalTokens,
        created: s.created,
        lastAccess: s.lastAccess
      }))
    };
  }

  /**
   * Cleanup old sessions
   */
  cleanupOldSessions(maxAgeMs = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = Date.now();
    const removed = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const lastAccess = new Date(session.lastAccess).getTime();
      
      if (now - lastAccess > maxAgeMs) {
        this.sessions.delete(sessionId);
        removed.push(sessionId);
      }
    }
    
    if (removed.length > 0) {
      console.log(`🧹 Cleaned up ${removed.length} old sessions`);
    }
    
    return removed;
  }
}

export default SessionManager;
