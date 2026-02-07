/**
 * Health Check - Gateway health monitoring
 */
class HealthCheck {
  constructor() {
    this.checks = new Map();
    this.lastResults = new Map();
  }

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
    
    console.log(`✅ Registered health check: ${name}`);
  }

  /**
   * Run a single health check
   */
  async runCheck(name) {
    const check = this.checks.get(name);
    
    if (!check) {
      throw new Error(`Health check not found: ${name}`);
    }
    
    console.log(`🏥 Running health check: ${name}`);
    
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
      console.log(`✅ Health check ${name}: healthy (${duration}ms)`);
      
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
      console.error(`❌ Health check ${name}: unhealthy - ${error.message}`);
      
      return checkResult;
    }
  }

  /**
   * Run all health checks
   */
  async runAll() {
    console.log('🏥 Running all health checks...');
    
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
    
    console.log(`✅ Health checks complete: ${summary.healthy}/${summary.total} healthy`);
    
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
}

export default HealthCheck;
