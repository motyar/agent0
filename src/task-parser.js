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
      // Standard patterns with required task descriptions
      /create\s+(?:a\s+)?pr\s+(?:to\s+)?(.+)/i,
      /make\s+(?:a\s+)?pr\s+(?:to\s+)?(.+)/i,
      /open\s+(?:a\s+)?pr\s+(?:to\s+)?(.+)/i,
      /create\s+(?:a\s+)?pull\s+request\s+(?:to\s+)?(.+)/i,
      /make\s+(?:a\s+)?pull\s+request\s+(?:to\s+)?(.+)/i,
      
      // Polite request patterns
      /^(?:can|could|please)\s+(?:you\s+)?create\s+(?:a\s+)?pr(?:\s+(?:to|for)\s+(.+))?[?!.]*$/i,
      
      // Question patterns (allowing filler words like "so" at the start)
      /^(?:so\s+)?(?:are\s+you\s+)?(?:able\s+to\s+)?create\s+(?:a\s+)?pr(?:\s+(?:for|to)\s+(.+))?[?!.]*$/i,
      
      // Start patterns (allowing filler words like "so" at the start)
      /^(?:so\s+)?(?:can\s+you\s+)?start\s+(?:a\s+)?(?:demo\s+)?pr(?:\s+(?:to\s+)?(.+))?[?!.]*$/i,
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
        let extracted = match[1].trim();
        
        // If empty after trim, continue to next pattern
        if (extracted.length === 0) {
          continue;
        }
        
        // Clean up common phrases that aren't real task descriptions
        // Remove variations of "this repo", "the repo", etc.
        const cleanupPattern = /^(?:for|on)?\s*(this|the)\s+repo[?!.]*/i;
        extracted = extracted.replace(cleanupPattern, '').trim();
        
        // If we still have content after cleanup, return it
        if (extracted.length > 0) {
          return extracted;
        }
      }
    }

    // If no valid task extracted, return null to trigger validation error
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
