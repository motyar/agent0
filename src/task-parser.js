#!/usr/bin/env node

import Logger from './logger.js';

/**
 * Task Parser - Parse task requests from messages
 */
class TaskParser {
  constructor() {
    this.logger = new Logger({ level: 'info' });
    
    // Patterns that indicate a PR creation request
    this.prPatterns = [
      /create\s+(?:a\s+)?pr\s+(?:to\s+)?(.+)/i,
      /make\s+(?:a\s+)?pr\s+(?:to\s+)?(.+)/i,
      /open\s+(?:a\s+)?pr\s+(?:to\s+)?(.+)/i,
      /create\s+(?:a\s+)?pull\s+request\s+(?:to\s+)?(.+)/i,
      /make\s+(?:a\s+)?pull\s+request\s+(?:to\s+)?(.+)/i,
      /can\s+you\s+create\s+(?:a\s+)?pr\s+(?:to\s+)?(.+)/i,
      /could\s+you\s+create\s+(?:a\s+)?pr\s+(?:to\s+)?(.+)/i,
      /please\s+create\s+(?:a\s+)?pr\s+(?:to\s+)?(.+)/i,
    ];

    // Keywords that suggest a task/PR request
    this.taskKeywords = [
      'implement',
      'add feature',
      'fix bug',
      'update',
      'modify',
      'refactor',
      'improve'
    ];
  }

  /**
   * Check if a message is requesting PR creation
   */
  isPRRequest(text) {
    if (!text) return false;
    
    const lowerText = text.toLowerCase().trim();
    
    // Check explicit PR patterns
    for (const pattern of this.prPatterns) {
      if (pattern.test(lowerText)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract task description from PR request
   */
  extractTaskDescription(text) {
    if (!text) return null;
    
    const lowerText = text.trim();
    
    // Try each pattern to extract the task
    for (const pattern of this.prPatterns) {
      const match = lowerText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If no pattern matches but it's a PR request, return full text
    if (this.isPRRequest(text)) {
      return text;
    }

    return null;
  }

  /**
   * Parse a message for task/PR request
   */
  parse(text) {
    const isPR = this.isPRRequest(text);
    const taskDescription = isPR ? this.extractTaskDescription(text) : null;

    return {
      isPRRequest: isPR,
      taskDescription,
      originalText: text
    };
  }

  /**
   * Validate task description
   */
  isValidTask(taskDescription) {
    if (!taskDescription) return false;
    
    // Must be at least 10 characters
    if (taskDescription.length < 10) return false;
    
    // Should not be too long (reasonable limit)
    if (taskDescription.length > 500) return false;
    
    return true;
  }
}

export default TaskParser;
