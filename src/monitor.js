/**
 * Monitor - Consolidated monitoring system
 * Combines Logger, HealthCheck, and UsageTracker functionality
 */
class Monitor {
  constructor(options = {}) {
    // Logger configuration
    this.level = options.level || 'info';
    this.enableColors = options.enableColors !== false;
    this.enableTimestamp = options.enableTimestamp !== false;
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };

    // Health check configuration
    this.checks = new Map();
    this.lastResults = new Map();

    // Usage tracking
    this.usage = {
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      by_model: {},
      by_date: {}
    };
  }

  // ===================
  // Logger Methods
  // ===================

  /**
   * Get current log level number
   */
  getCurrentLevel() {
    return this.levels[this.level] || 2;
  }

  /**
   * Format timestamp
   */
  timestamp() {
    if (!this.enableTimestamp) return '';
    return `[${new Date().toISOString()}] `;
  }

  /**
   * Colorize log message
   */
  colorize(level, message) {
    if (!this.enableColors) return message;
    
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[35m', // Magenta
      trace: '\x1b[37m'  // White
    };
    
    const reset = '\x1b[0m';
    return `${colors[level] || ''}${message}${reset}`;
  }

  /**
   * Log message
   */
  log(level, message, ...args) {
    if (this.levels[level] > this.getCurrentLevel()) {
      return;
    }
    
    const prefix = this.timestamp();
    const levelStr = level.toUpperCase().padEnd(5);
    const formattedMessage = this.colorize(level, `${prefix}[${levelStr}] ${message}`);
    
    console.log(formattedMessage, ...args);
  }

  /**
   * Error log
   */
  error(message, ...args) {
    this.log('error', `❌ ${message}`, ...args);
  }

  /**
   * Warning log
   */
  warn(message, ...args) {
    this.log('warn', `⚠️  ${message}`, ...args);
  }

  /**
   * Info log
   */
  info(message, ...args) {
    this.log('info', `ℹ️  ${message}`, ...args);
  }

  /**
   * Debug log
   */
  debug(message, ...args) {
    this.log('debug', `🐛 ${message}`, ...args);
  }

  /**
   * Trace log
   */
  trace(message, ...args) {
    this.log('trace', `🔍 ${message}`, ...args);
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.level = level;
      this.info(`Log level set to: ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  // ===================
  // Health Check Methods
  // ===================

  /**
   * Register a health check
   */
  register(name, checkFn, options = {}) {
    this.checks.set(name, {
      fn: checkFn,
      interval: options.interval || 60000, // 1 minute default
      timeout: options.timeout || 5000, // 5 seconds default
      critical: options.critical || false
    });
    
    this.info(`Registered health check: ${name}`);
  }

  /**
   * Run a single health check
   */
  async runCheck(name) {
    const check = this.checks.get(name);
    
    if (!check) {
      throw new Error(`Health check not found: ${name}`);
    }
    
    this.debug(`Running health check: ${name}`);
    
    try {
      const startTime = Date.now();
      const result = await Promise.race([
        check.fn(),
        this.timeout(check.timeout)
      ]);
      
      const duration = Date.now() - startTime;
      
      const checkResult = {
        name,
        status: 'healthy',
        duration,
        timestamp: new Date().toISOString(),
        details: result
      };
      
      this.lastResults.set(name, checkResult);
      this.debug(`Health check ${name}: healthy (${duration}ms)`);
      
      return checkResult;
    } catch (error) {
      const checkResult = {
        name,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
        critical: check.critical
      };
      
      this.lastResults.set(name, checkResult);
      this.error(`Health check ${name}: unhealthy - ${error.message}`);
      
      return checkResult;
    }
  }

  /**
   * Run all health checks
   */
  async runAll() {
    this.info('Running all health checks...');
    
    const results = [];
    
    for (const name of this.checks.keys()) {
      const result = await this.runCheck(name);
      results.push(result);
    }
    
    const summary = {
      timestamp: new Date().toISOString(),
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      checks: results
    };
    
    this.info(`Health checks complete: ${summary.healthy}/${summary.total} healthy`);
    
    return summary;
  }

  /**
   * Get last health check results
   */
  getLastResults() {
    const results = [];
    
    for (const result of this.lastResults.values()) {
      results.push(result);
    }
    
    return results;
  }

  /**
   * Timeout helper
   */
  timeout(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Health check timeout')), ms)
    );
  }

  // ===================
  // Usage Tracking Methods
  // ===================

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
  resetUsage() {
    this.usage = {
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      by_model: {},
      by_date: {}
    };
    
    this.info('Usage statistics reset');
  }
}

export default Monitor;
