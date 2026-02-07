/**
 * Logger - Comprehensive logging system
 */
class Logger {
  constructor(options = {}) {
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
  }

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
}

export default Logger;
