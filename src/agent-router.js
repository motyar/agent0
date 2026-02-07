import fs from 'fs/promises';
import path from 'path';

/**
 * Multi-agent routing system
 * Routes messages to different agent instances based on configuration
 */
class AgentRouter {
  constructor() {
    this.config = null;
    this.agents = new Map();
  }

  /**
   * Initialize the router by parsing AGENTS.md configuration
   */
  async initialize() {
    try {
      // Read AGENTS.md
      const agentsContent = await fs.readFile('AGENTS.md', 'utf-8');
      this.config = this.parseAgentsConfig(agentsContent);
      
      console.log(`✅ Agent router initialized with ${Object.keys(this.config.agents || {}).length} agent(s)`);
      return true;
    } catch (error) {
      console.warn('⚠️ AGENTS.md not found or invalid, using default single-agent configuration');
      this.config = this.getDefaultConfig();
      return false;
    }
  }

  /**
   * Parse AGENTS.md to extract agent configuration
   */
  parseAgentsConfig(content) {
    // Extract JSON configuration from markdown
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch) {
      try {
        const config = JSON.parse(jsonMatch[1]);
        return config.routing || config;
      } catch (error) {
        console.error('Failed to parse AGENTS.md JSON:', error.message);
        return this.getDefaultConfig();
      }
    }

    // If no JSON found, return default config
    return this.getDefaultConfig();
  }

  /**
   * Get default configuration for single-agent mode
   */
  getDefaultConfig() {
    return {
      enabled: false,
      strategy: 'single',
      agents: {
        primary: {
          channels: ['*'],
          model: 'gpt-4o-mini',
          capabilities: ['conversation', 'memory', 'learning', 'code_generation', 'tool_execution']
        }
      }
    };
  }

  /**
   * Route a message to the appropriate agent
   * Returns the agent identifier that should handle this message
   */
  route(message, context = {}) {
    // If routing is not enabled, always use primary agent
    if (!this.config || !this.config.enabled) {
      return 'primary';
    }

    const { channel, taskType, userId } = context;

    // Channel-based routing
    if (this.config.strategy === 'channel-based' && channel) {
      for (const [agentId, agentConfig] of Object.entries(this.config.agents)) {
        if (agentConfig.channels) {
          // Check if agent handles this channel
          if (agentConfig.channels.includes(channel) || agentConfig.channels.includes('*')) {
            return agentId;
          }
        }
      }
    }

    // Capability-based routing
    if (this.config.strategy === 'capability-based' && taskType) {
      for (const [agentId, agentConfig] of Object.entries(this.config.agents)) {
        if (agentConfig.capabilities && agentConfig.capabilities.includes(taskType)) {
          return agentId;
        }
      }
    }

    // Task-based routing using content analysis
    if (message && message.text) {
      const text = message.text.toLowerCase();
      
      // Check for support/help keywords
      if (text.includes('help') || text.includes('support') || text.includes('problem')) {
        // Route to support agent if available
        if (this.config.agents.support) {
          return 'support';
        }
      }

      // Check for code-related keywords
      if (text.includes('code') || text.includes('bug') || text.includes('function') || text.includes('implement')) {
        // Route to code agent if available
        if (this.config.agents.code) {
          return 'code';
        }
      }
    }

    // Default to primary agent
    return 'primary';
  }

  /**
   * Get agent configuration by ID
   */
  getAgentConfig(agentId) {
    if (!this.config || !this.config.agents) {
      return null;
    }
    return this.config.agents[agentId] || null;
  }

  /**
   * Check if an agent has a specific capability
   */
  hasCapability(agentId, capability) {
    const config = this.getAgentConfig(agentId);
    if (!config || !config.capabilities) {
      return false;
    }
    return config.capabilities.includes(capability);
  }

  /**
   * Hand off a conversation to another agent
   * Returns the target agent ID and handoff metadata
   */
  handoff(fromAgentId, toAgentId, reason, context = {}) {
    const fromConfig = this.getAgentConfig(fromAgentId);
    const toConfig = this.getAgentConfig(toAgentId);

    if (!toConfig) {
      throw new Error(`Target agent '${toAgentId}' not found`);
    }

    return {
      from: fromAgentId,
      to: toAgentId,
      reason,
      timestamp: new Date().toISOString(),
      context,
      fromModel: fromConfig?.model,
      toModel: toConfig?.model
    };
  }

  /**
   * Get list of all available agents
   */
  getAvailableAgents() {
    if (!this.config || !this.config.agents) {
      return ['primary'];
    }
    return Object.keys(this.config.agents);
  }

  /**
   * Check if multi-agent routing is enabled
   */
  isEnabled() {
    return this.config && this.config.enabled === true;
  }
}

export default AgentRouter;
