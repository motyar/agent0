/**
 * Usage Tracker - Monitor API usage and costs
 */
class UsageTracker {
  constructor() {
    this.usage = {
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      by_model: {},
      by_date: {}
    };
  }

  /**
   * Track an API call
   */
  track(model, tokens, cost) {
    const date = new Date().toISOString().split('T')[0];
    
    // Update totals
    this.usage.total_requests++;
    this.usage.total_tokens += tokens;
    this.usage.total_cost += cost;
    
    // Update by model
    if (!this.usage.by_model[model]) {
      this.usage.by_model[model] = {
        requests: 0,
        tokens: 0,
        cost: 0
      };
    }
    
    this.usage.by_model[model].requests++;
    this.usage.by_model[model].tokens += tokens;
    this.usage.by_model[model].cost += cost;
    
    // Update by date
    if (!this.usage.by_date[date]) {
      this.usage.by_date[date] = {
        requests: 0,
        tokens: 0,
        cost: 0
      };
    }
    
    this.usage.by_date[date].requests++;
    this.usage.by_date[date].tokens += tokens;
    this.usage.by_date[date].cost += cost;
    
    console.log(`📊 API usage tracked: ${model} - ${tokens} tokens ($${cost.toFixed(4)})`);
  }

  /**
   * Get usage summary
   */
  getSummary() {
    return {
      total: {
        requests: this.usage.total_requests,
        tokens: this.usage.total_tokens,
        cost: this.usage.total_cost
      },
      by_model: this.usage.by_model,
      by_date: this.usage.by_date
    };
  }

  /**
   * Get usage for specific date
   */
  getUsageByDate(date) {
    return this.usage.by_date[date] || {
      requests: 0,
      tokens: 0,
      cost: 0
    };
  }

  /**
   * Get usage for specific model
   */
  getUsageByModel(model) {
    return this.usage.by_model[model] || {
      requests: 0,
      tokens: 0,
      cost: 0
    };
  }

  /**
   * Reset usage statistics
   */
  reset() {
    this.usage = {
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      by_model: {},
      by_date: {}
    };
    
    console.log('✅ Usage statistics reset');
  }
}

export default UsageTracker;
