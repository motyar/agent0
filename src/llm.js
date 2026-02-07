import OpenAI from 'openai';
import fs from 'fs/promises';

/**
 * LLM - Multi-provider Large Language Model abstraction
 * Supports OpenAI, Anthropic Claude, and other providers
 */
class LLM {
  constructor(options = {}) {
    this.configPath = options.configPath || 'config/models.json';
    this.defaultProvider = options.defaultProvider || 'openai';
    this.defaultModel = options.defaultModel || 'gpt-4o-mini';
    
    this.providers = {};
    this.config = null;
  }

  /**
   * Initialize LLM with configuration
   */
  async initialize() {
    console.log('🤖 Initializing LLM...');
    
    // Load configuration
    await this.loadConfig();
    
    // Initialize providers
    this.initializeProviders();
    
    console.log(`✅ LLM initialized (default: ${this.defaultProvider}/${this.defaultModel})`);
  }

  /**
   * Load models configuration
   */
  async loadConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
      
      // Apply config defaults
      if (this.config.default_provider) {
        this.defaultProvider = this.config.default_provider;
      }
      if (this.config.default_model) {
        this.defaultModel = this.config.default_model;
      }
    } catch (error) {
      console.warn('⚠️  Could not load models config, using defaults');
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      default_provider: 'openai',
      default_model: 'gpt-4o-mini',
      providers: {
        openai: {
          enabled: true,
          api_key_env: 'OPENAI_API_KEY',
          models: {
            'gpt-4o-mini': {
              max_tokens: 4096,
              cost_per_1k_input: 0.00015,
              cost_per_1k_output: 0.0006
            },
            'gpt-4o': {
              max_tokens: 4096,
              cost_per_1k_input: 0.0025,
              cost_per_1k_output: 0.01
            }
          }
        },
        anthropic: {
          enabled: false,
          api_key_env: 'ANTHROPIC_API_KEY',
          models: {
            'claude-3-5-sonnet-20241022': {
              max_tokens: 4096,
              cost_per_1k_input: 0.003,
              cost_per_1k_output: 0.015
            },
            'claude-3-5-haiku-20241022': {
              max_tokens: 4096,
              cost_per_1k_input: 0.001,
              cost_per_1k_output: 0.005
            }
          }
        }
      }
    };
  }

  /**
   * Initialize provider clients
   */
  initializeProviders() {
    // Initialize OpenAI
    if (this.isProviderEnabled('openai')) {
      const apiKey = process.env[this.config.providers.openai.api_key_env];
      if (apiKey) {
        this.providers.openai = new OpenAI({ apiKey });
        console.log('  ✅ OpenAI provider initialized');
      } else {
        console.warn('  ⚠️  OpenAI API key not found');
      }
    }

    // Initialize Anthropic
    if (this.isProviderEnabled('anthropic')) {
      const apiKey = process.env[this.config.providers.anthropic.api_key_env];
      if (apiKey) {
        // Lazy load Anthropic SDK only if needed
        this.providers.anthropic = { apiKey };
        console.log('  ✅ Anthropic provider configured');
      } else {
        console.warn('  ⚠️  Anthropic API key not found');
      }
    }
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(provider) {
    return this.config?.providers?.[provider]?.enabled || false;
  }

  /**
   * Generate completion using specified or default provider
   */
  async complete(options = {}) {
    const {
      messages,
      model = this.defaultModel,
      provider = this.defaultProvider,
      max_tokens,
      temperature = 0.7,
      ...otherOptions
    } = options;

    // Validate inputs
    if (!messages || !Array.isArray(messages)) {
      throw new Error('messages array is required');
    }

    // Determine provider from model if not specified
    const targetProvider = this.getProviderForModel(model, provider);
    
    console.log(`🤖 Generating completion with ${targetProvider}/${model}`);

    // Route to appropriate provider
    switch (targetProvider) {
      case 'openai':
        return await this.completeOpenAI(messages, model, max_tokens, temperature, otherOptions);
      
      case 'anthropic':
        return await this.completeAnthropic(messages, model, max_tokens, temperature, otherOptions);
      
      default:
        throw new Error(`Unsupported provider: ${targetProvider}`);
    }
  }

  /**
   * Get provider for a specific model
   */
  getProviderForModel(model, defaultProvider) {
    // Check each provider's models
    for (const [providerName, providerConfig] of Object.entries(this.config.providers)) {
      if (providerConfig.models && providerConfig.models[model]) {
        return providerName;
      }
    }
    
    // Return default if model not found
    return defaultProvider;
  }

  /**
   * OpenAI completion
   */
  async completeOpenAI(messages, model, max_tokens, temperature, otherOptions) {
    if (!this.providers.openai) {
      throw new Error('OpenAI provider not initialized');
    }

    // Get model config
    const modelConfig = this.config.providers.openai.models[model];
    const maxTokens = max_tokens || modelConfig?.max_tokens || 512;

    const response = await this.providers.openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...otherOptions
    });

    const content = response.choices[0].message.content;
    const usage = {
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0
    };

    return {
      content,
      usage,
      cost: this.calculateCost('openai', model, usage),
      provider: 'openai',
      model,
      raw: response
    };
  }

  /**
   * Anthropic completion
   */
  async completeAnthropic(messages, model, max_tokens, temperature, otherOptions) {
    // Lazy load Anthropic SDK
    let Anthropic;
    try {
      const anthropicModule = await import('@anthropic-ai/sdk');
      Anthropic = anthropicModule.default;
    } catch (error) {
      throw new Error('Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk');
    }

    if (!this.providers.anthropic) {
      throw new Error('Anthropic provider not initialized');
    }

    // Initialize Anthropic client if needed
    if (!this.providers.anthropic.client) {
      this.providers.anthropic.client = new Anthropic({
        apiKey: this.providers.anthropic.apiKey
      });
    }

    // Get model config
    const modelConfig = this.config.providers.anthropic.models[model];
    const maxTokens = max_tokens || modelConfig?.max_tokens || 512;

    // Convert OpenAI format messages to Anthropic format
    const { system, messages: anthropicMessages } = this.convertToAnthropicFormat(messages);

    const response = await this.providers.anthropic.client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: anthropicMessages,
      ...otherOptions
    });

    const content = response.content[0].text;
    const usage = {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens
    };

    return {
      content,
      usage,
      cost: this.calculateCost('anthropic', model, usage),
      provider: 'anthropic',
      model,
      raw: response
    };
  }

  /**
   * Convert OpenAI format messages to Anthropic format
   */
  convertToAnthropicFormat(messages) {
    const system = [];
    const anthropicMessages = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system.push(msg.content);
      } else {
        anthropicMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }

    return {
      system: system.join('\n\n'),
      messages: anthropicMessages
    };
  }

  /**
   * Calculate cost for a completion
   */
  calculateCost(provider, model, usage) {
    const modelConfig = this.config.providers[provider]?.models[model];
    
    if (!modelConfig) {
      return 0;
    }

    const inputCost = (usage.input_tokens / 1000) * modelConfig.cost_per_1k_input;
    const outputCost = (usage.output_tokens / 1000) * modelConfig.cost_per_1k_output;
    
    return inputCost + outputCost;
  }

  /**
   * Get available models
   */
  getAvailableModels() {
    const models = [];
    
    for (const [providerName, providerConfig] of Object.entries(this.config.providers)) {
      if (providerConfig.enabled && providerConfig.models) {
        for (const modelName of Object.keys(providerConfig.models)) {
          models.push({
            provider: providerName,
            model: modelName,
            ...providerConfig.models[modelName]
          });
        }
      }
    }
    
    return models;
  }

  /**
   * Get model information
   */
  getModelInfo(model) {
    for (const [providerName, providerConfig] of Object.entries(this.config.providers)) {
      if (providerConfig.models && providerConfig.models[model]) {
        return {
          provider: providerName,
          model,
          ...providerConfig.models[model]
        };
      }
    }
    
    return null;
  }
}

export default LLM;
