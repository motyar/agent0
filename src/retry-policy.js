/**
 * Retry Policy - Automatic retry with exponential backoff
 */
class RetryPolicy {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 10000;
    this.backoffFactor = options.backoffFactor || 2;
  }

  /**
   * Execute a function with retry logic
   */
  async execute(fn, context = 'operation') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${this.maxAttempts} for ${context}`);
        const result = await fn();
        console.log(`✅ ${context} succeeded on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  Attempt ${attempt} failed for ${context}: ${error.message}`);
        
        if (attempt < this.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }
    
    console.error(`❌ All ${this.maxAttempts} attempts failed for ${context}`);
    throw lastError;
  }

  /**
   * Calculate delay with exponential backoff
   */
  calculateDelay(attempt) {
    const delay = this.initialDelay * Math.pow(this.backoffFactor, attempt - 1);
    return Math.min(delay, this.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default RetryPolicy;
