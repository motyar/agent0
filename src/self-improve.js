#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import LLM from './llm.js';
import MemoryEngine from './memory-engine.js';
import Monitor from './monitor.js';

/**
 * Self-Improvement Loop
 * Analyzes agent performance and generates improvements
 */
class SelfImprove {
  constructor() {
    this.llm = new LLM();
    this.memory = new MemoryEngine();
    this.monitor = new Monitor({ level: 'info' });
    this.identity = null;
    this.soul = null;
  }

  async initialize() {
    this.monitor.info('🌟 Initializing self-improvement system...');
    
    // Load identity and soul
    const identityData = await fs.readFile('agents/primary/identity.json', 'utf-8');
    this.identity = JSON.parse(identityData);
    
    this.soul = await fs.readFile('agents/primary/soul.md', 'utf-8');
    
    // Initialize LLM
    await this.llm.initialize();
    
    this.monitor.info('✅ Self-improvement system ready');
  }

  /**
   * Run self-improvement analysis
   */
  async analyze() {
    this.monitor.info('🔍 Starting self-improvement analysis...');
    
    try {
      // Gather data for analysis
      const data = await this.gatherAnalysisData();
      
      // Perform analysis
      const analysis = await this.performAnalysis(data);
      
      // Generate improvement suggestions
      const suggestions = await this.generateSuggestions(analysis);
      
      // Save analysis results
      await this.saveAnalysis({
        timestamp: new Date().toISOString(),
        data,
        analysis,
        suggestions
      });
      
      this.monitor.info('✅ Self-improvement analysis complete');
      
      return {
        success: true,
        analysis,
        suggestions
      };
      
    } catch (error) {
      this.monitor.error('Failed to complete self-improvement analysis:', error);
      throw error;
    }
  }

  /**
   * Gather data for analysis
   */
  async gatherAnalysisData() {
    this.monitor.info('📊 Gathering analysis data...');
    
    const data = {
      identity: this.identity,
      memory_summary: await this.memory.getSummary(),
      recent_conversations: await this.getRecentConversations(),
      performance_metrics: await this.getPerformanceMetrics(),
      current_capabilities: await this.getCurrentCapabilities()
    };
    
    return data;
  }

  /**
   * Get recent conversations for analysis
   */
  async getRecentConversations() {
    try {
      const summary = await this.memory.getSummary();
      if (!summary || !summary.users) {
        return [];
      }
      
      const conversations = [];
      const userIds = Object.keys(summary.users).slice(0, 5); // Last 5 users
      
      for (const userId of userIds) {
        const history = await this.memory.recall(userId, 5);
        if (history.length > 0) {
          conversations.push({
            user_id: userId,
            turns: history
          });
        }
      }
      
      return conversations;
    } catch (error) {
      this.monitor.warn('Could not load recent conversations:', error.message);
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    return {
      total_messages: this.identity.stats?.total_messages_processed || 0,
      users_served: this.identity.stats?.users_served || 0,
      total_conversations: this.identity.stats?.total_conversations || 0,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };
  }

  /**
   * Get current capabilities
   */
  async getCurrentCapabilities() {
    try {
      const skillsPath = 'skills/bundled';
      const files = await fs.readdir(skillsPath);
      const skills = files.filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
      
      return {
        skills,
        skill_count: skills.length
      };
    } catch (error) {
      return {
        skills: [],
        skill_count: 0
      };
    }
  }

  /**
   * Perform analysis using LLM
   */
  async performAnalysis(data) {
    this.monitor.info('🤖 Performing AI-powered analysis...');
    
    const prompt = this.buildAnalysisPrompt(data);
    
    const result = await this.llm.complete({
      messages: [
        {
          role: 'system',
          content: 'You are an AI system analyzer. Analyze the agent\'s performance and identify areas for improvement.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });
    
    this.monitor.info(`Analysis complete (${result.usage.total_tokens} tokens, $${result.cost.toFixed(4)})`);
    
    return result.content;
  }

  /**
   * Build analysis prompt
   */
  buildAnalysisPrompt(data) {
    return `Analyze the following AI agent's performance and identify areas for improvement:

**Agent Identity:**
- Version: ${data.identity.version}
- Model: ${data.identity.model?.name || 'Not specified'}

**Performance Metrics:**
- Total Messages: ${data.performance_metrics.total_messages}
- Users Served: ${data.performance_metrics.users_served}
- Total Conversations: ${data.performance_metrics.total_conversations}

**Current Capabilities:**
- Skills: ${data.current_capabilities.skills.join(', ')}
- Skill Count: ${data.current_capabilities.skill_count}

**Memory Summary:**
- Total Users: ${data.memory_summary?.users ? Object.keys(data.memory_summary.users).length : 0}
- Total Conversations: ${data.memory_summary?.total_conversations || 0}

**Recent Conversations:**
${this.formatRecentConversations(data.recent_conversations)}

Please analyze:
1. What is the agent doing well?
2. What capabilities are missing or underutilized?
3. Are there patterns in user interactions that suggest new features?
4. What technical improvements could enhance performance?
5. What new skills would be most valuable?

Provide specific, actionable insights.`;
  }

  /**
   * Format recent conversations for analysis
   */
  formatRecentConversations(conversations) {
    if (!conversations || conversations.length === 0) {
      return 'No recent conversations available';
    }
    
    return conversations.slice(0, 3).map((conv, idx) => {
      const sample = conv.turns.slice(-2).map(turn => 
        `User: ${turn.user.slice(0, 100)}...\nBot: ${turn.bot.slice(0, 100)}...`
      ).join('\n');
      
      return `Conversation ${idx + 1}:\n${sample}`;
    }).join('\n\n');
  }

  /**
   * Generate improvement suggestions
   */
  async generateSuggestions(analysis) {
    this.monitor.info('💡 Generating improvement suggestions...');
    
    const prompt = `Based on this analysis:

${analysis}

Generate 3-5 specific, actionable improvement suggestions for the AI agent. For each suggestion, include:
1. Title: Brief description
2. Priority: High/Medium/Low
3. Type: Feature/Performance/Bug/Documentation
4. Description: Detailed explanation
5. Implementation: Concrete steps to implement

Format as JSON array.`;
    
    const result = await this.llm.complete({
      messages: [
        {
          role: 'system',
          content: 'You are an AI improvement advisor. Generate specific, actionable suggestions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1500
    });
    
    this.monitor.info(`Suggestions generated (${result.usage.total_tokens} tokens, $${result.cost.toFixed(4)})`);
    
    // Try to parse as JSON, fallback to raw text
    try {
      return JSON.parse(result.content);
    } catch (error) {
      return [{
        title: 'Improvement Suggestions',
        priority: 'Medium',
        type: 'Documentation',
        description: result.content,
        implementation: 'Review the suggestions and implement as appropriate'
      }];
    }
  }

  /**
   * Save analysis results
   */
  async saveAnalysis(results) {
    const analysisDir = 'memory/self-improvement';
    await fs.mkdir(analysisDir, { recursive: true });
    
    const filename = `analysis-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(analysisDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    
    this.monitor.info(`📝 Analysis saved to ${filepath}`);
  }

  /**
   * Display analysis results
   */
  displayResults(results) {
    console.log('\n' + '='.repeat(60));
    console.log('🌟 SELF-IMPROVEMENT ANALYSIS RESULTS');
    console.log('='.repeat(60) + '\n');
    
    console.log('📊 ANALYSIS:');
    console.log(results.analysis);
    console.log('\n' + '-'.repeat(60) + '\n');
    
    console.log('💡 IMPROVEMENT SUGGESTIONS:');
    
    if (Array.isArray(results.suggestions)) {
      results.suggestions.forEach((suggestion, idx) => {
        console.log(`\n${idx + 1}. ${suggestion.title || 'Suggestion'}`);
        console.log(`   Priority: ${suggestion.priority || 'N/A'}`);
        console.log(`   Type: ${suggestion.type || 'N/A'}`);
        console.log(`   ${suggestion.description || 'No description'}`);
      });
    } else {
      console.log(JSON.stringify(results.suggestions, null, 2));
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const improver = new SelfImprove();
  
  improver.initialize()
    .then(() => improver.analyze())
    .then((results) => {
      improver.displayResults(results);
      console.log('✅ Self-improvement analysis complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Self-improvement failed:', error);
      process.exit(1);
    });
}

export default SelfImprove;
