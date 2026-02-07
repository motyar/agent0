import chokidar from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Hot reload system for Agent0
 * Monitors changes in src/ directory and reloads components
 */
class HotReload {
  constructor(agent) {
    this.agent = agent;
    this.watcher = null;
    this.isReloading = false;
    this.watchPath = 'src';
    this.debounceTimer = null;
    this.debounceDelay = 1000; // 1 second debounce
  }

  /**
   * Start watching for file changes
   */
  start() {
    console.log('🔥 Hot reload: Starting file watcher...');

    this.watcher = chokidar.watch(this.watchPath, {
      ignored: [
        /(^|[\/\\])\../, // Ignore dotfiles
        '**/node_modules/**',
        '**/*.test.js',
        '**/*.spec.js'
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    // Watch for changes
    this.watcher
      .on('change', (filepath) => this.handleChange(filepath))
      .on('add', (filepath) => this.handleAdd(filepath))
      .on('unlink', (filepath) => this.handleUnlink(filepath))
      .on('error', (error) => this.handleError(error));

    console.log(`🔥 Hot reload: Watching ${this.watchPath}/ for changes`);
  }

  /**
   * Stop watching for file changes
   */
  async stop() {
    if (this.watcher) {
      console.log('🔥 Hot reload: Stopping file watcher...');
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Handle file change
   */
  handleChange(filepath) {
    console.log(`🔥 Hot reload: File changed: ${filepath}`);
    this.scheduleReload(filepath, 'change');
  }

  /**
   * Handle file addition
   */
  handleAdd(filepath) {
    console.log(`🔥 Hot reload: File added: ${filepath}`);
    this.scheduleReload(filepath, 'add');
  }

  /**
   * Handle file deletion
   */
  handleUnlink(filepath) {
    console.log(`🔥 Hot reload: File removed: ${filepath}`);
    this.scheduleReload(filepath, 'unlink');
  }

  /**
   * Handle watcher errors
   */
  handleError(error) {
    console.error('🔥 Hot reload: Watcher error:', error);
  }

  /**
   * Schedule reload with debouncing to avoid multiple rapid reloads
   */
  scheduleReload(filepath, eventType) {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Schedule new reload
    this.debounceTimer = setTimeout(() => {
      this.reload(filepath, eventType);
    }, this.debounceDelay);
  }

  /**
   * Reload the appropriate component based on changed file
   */
  async reload(filepath, eventType) {
    if (this.isReloading) {
      console.log('🔥 Hot reload: Already reloading, skipping...');
      return;
    }

    this.isReloading = true;

    try {
      const filename = path.basename(filepath);
      console.log(`🔥 Hot reload: Reloading ${filename}...`);

      // Determine what needs to be reloaded based on the file
      if (filename.includes('memory-engine')) {
        await this.reloadMemoryEngine();
      } else if (filename.includes('telegram')) {
        await this.reloadTelegram();
      } else if (filename.includes('scheduler')) {
        await this.reloadScheduler();
      } else if (filename.includes('skills')) {
        await this.reloadSkills();
      } else if (filename.includes('agent-router')) {
        await this.reloadRouter();
      } else if (filename.includes('sandbox')) {
        await this.reloadSandbox();
      } else {
        console.log(`🔥 Hot reload: No specific reload handler for ${filename}, full reload may be required`);
      }

      console.log(`✅ Hot reload: ${filename} reloaded successfully`);
    } catch (error) {
      console.error('❌ Hot reload: Failed to reload:', error.message);
    } finally {
      this.isReloading = false;
    }
  }

  /**
   * Reload memory engine
   */
  async reloadMemoryEngine() {
    const modulePath = path.resolve('src/memory-engine.js');
    
    // Clear module cache
    delete globalThis.__memoryEngineCache;
    
    // Reimport module
    const { default: MemoryEngine } = await import(`${modulePath}?t=${Date.now()}`);
    
    // Create new instance
    this.agent.memory = new MemoryEngine();
    
    console.log('🔄 Memory engine reloaded');
  }

  /**
   * Reload telegram service
   */
  async reloadTelegram() {
    const modulePath = path.resolve('src/telegram.js');
    
    // Clear module cache
    delete globalThis.__telegramCache;
    
    // Reimport module
    const { default: TelegramService } = await import(`${modulePath}?t=${Date.now()}`);
    
    // Create new instance
    this.agent.telegram = new TelegramService();
    
    console.log('🔄 Telegram service reloaded');
  }

  /**
   * Reload scheduler
   */
  async reloadScheduler() {
    const modulePath = path.resolve('src/scheduler.js');
    
    // Stop current scheduler
    if (this.agent.scheduler) {
      this.agent.scheduler.stop();
    }
    
    // Clear module cache
    delete globalThis.__schedulerCache;
    
    // Reimport module
    const { default: Scheduler } = await import(`${modulePath}?t=${Date.now()}`);
    
    // Create and initialize new instance
    this.agent.scheduler = new Scheduler();
    await this.agent.scheduler.initialize();
    
    console.log('🔄 Scheduler reloaded');
  }

  /**
   * Reload skills system
   */
  async reloadSkills() {
    // Reload skills context
    if (this.agent.skillManager) {
      this.agent.skillsContext = await this.agent.skillManager.getSkillsContext();
      console.log('🔄 Skills context reloaded');
    }
  }

  /**
   * Reload agent router
   */
  async reloadRouter() {
    if (this.agent.router) {
      await this.agent.router.initialize();
      console.log('🔄 Agent router reloaded');
    }
  }

  /**
   * Reload sandbox
   */
  async reloadSandbox() {
    const modulePath = path.resolve('src/sandbox.js');
    
    // Clear module cache
    delete globalThis.__sandboxCache;
    
    // Reimport module
    const { default: Sandbox } = await import(`${modulePath}?t=${Date.now()}`);
    
    // Create new instance if agent has sandbox
    if (this.agent.sandbox) {
      this.agent.sandbox = new Sandbox();
    }
    
    console.log('🔄 Sandbox reloaded');
  }

  /**
   * Check if hot reload is enabled
   */
  isEnabled() {
    return this.watcher !== null;
  }
}

export default HotReload;
