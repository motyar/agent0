import fs from 'fs/promises';
import { CronJob } from 'cron';

/**
 * Scheduler handles cron jobs and time-based triggers for Agent0
 */
class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.configPath = 'config/scheduler.json';
  }

  /**
   * Initialize scheduler and load scheduled tasks
   */
  async initialize() {
    console.log('⏰ Initializing scheduler...');
    
    try {
      const config = await this.loadConfig();
      
      // Register cron jobs
      if (config.cron_jobs) {
        for (const job of config.cron_jobs) {
          this.registerCronJob(job);
        }
      }
      
      // Register wakeup tasks
      if (config.wakeup_tasks) {
        for (const task of config.wakeup_tasks) {
          this.registerWakeupTask(task);
        }
      }
      
      console.log(`✅ Scheduler initialized with ${this.jobs.size} tasks`);
    } catch (error) {
      console.error('❌ Failed to initialize scheduler:', error.message);
      // Continue without scheduler if config doesn't exist
      console.log('⚠️  Continuing without scheduled tasks');
    }
  }

  /**
   * Load scheduler configuration
   */
  async loadConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Return default config if file doesn't exist
      return {
        cron_jobs: [],
        wakeup_tasks: []
      };
    }
  }

  /**
   * Register a cron job
   */
  registerCronJob(jobConfig) {
    const { id, schedule, task, enabled = true } = jobConfig;
    
    if (!enabled) {
      console.log(`⏭️  Skipping disabled job: ${id}`);
      return;
    }
    
    try {
      const job = new CronJob(
        schedule,
        async () => {
          console.log(`🔔 Executing cron job: ${id}`);
          await this.executeTask(task);
        },
        null,
        true,
        'UTC'
      );
      
      this.jobs.set(id, job);
      console.log(`✅ Registered cron job: ${id} (${schedule})`);
    } catch (error) {
      console.error(`❌ Failed to register cron job ${id}:`, error.message);
    }
  }

  /**
   * Register a wakeup task (time-based trigger)
   */
  registerWakeupTask(taskConfig) {
    const { id, trigger_time, task, enabled = true } = taskConfig;
    
    if (!enabled) {
      console.log(`⏭️  Skipping disabled wakeup task: ${id}`);
      return;
    }
    
    const now = new Date();
    const triggerDate = new Date(trigger_time);
    
    if (triggerDate <= now) {
      console.log(`⚠️  Wakeup task ${id} trigger time has passed, skipping`);
      return;
    }
    
    const delay = triggerDate - now;
    
    const timeout = setTimeout(async () => {
      console.log(`⏰ Executing wakeup task: ${id}`);
      await this.executeTask(task);
      this.jobs.delete(id);
    }, delay);
    
    this.jobs.set(id, { type: 'wakeup', timeout });
    console.log(`✅ Registered wakeup task: ${id} (${trigger_time})`);
  }

  /**
   * Execute a scheduled task
   */
  async executeTask(task) {
    try {
      const { type, handler, params = {} } = task;
      
      switch (type) {
        case 'self_analysis':
          await this.runSelfAnalysis(params);
          break;
        case 'memory_cleanup':
          await this.runMemoryCleanup(params);
          break;
        case 'health_check':
          await this.runHealthCheck(params);
          break;
        case 'custom':
          if (handler) {
            await this.runCustomTask(handler, params);
          }
          break;
        default:
          console.warn(`⚠️  Unknown task type: ${type}`);
      }
    } catch (error) {
      console.error('❌ Task execution failed:', error.message);
    }
  }

  /**
   * Run self-analysis task
   */
  async runSelfAnalysis(params) {
    console.log('🔍 Running self-analysis...');
    // TODO: Implement self-analysis logic
    console.log('✅ Self-analysis complete');
  }

  /**
   * Run memory cleanup task
   */
  async runMemoryCleanup(params) {
    console.log('🧹 Running memory cleanup...');
    // TODO: Implement memory cleanup logic
    console.log('✅ Memory cleanup complete');
  }

  /**
   * Run health check task
   */
  async runHealthCheck(params) {
    console.log('🏥 Running health check...');
    // TODO: Implement health check logic
    console.log('✅ Health check complete');
  }

  /**
   * Run custom task
   */
  async runCustomTask(handler, params) {
    console.log(`⚙️  Running custom task: ${handler}`);
    // TODO: Implement custom task execution
    console.log('✅ Custom task complete');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    console.log('🛑 Stopping scheduler...');
    
    for (const [id, job] of this.jobs.entries()) {
      if (job.stop) {
        job.stop();
      } else if (job.timeout) {
        clearTimeout(job.timeout);
      }
      console.log(`✅ Stopped task: ${id}`);
    }
    
    this.jobs.clear();
    console.log('✅ Scheduler stopped');
  }

  /**
   * Get status of all scheduled tasks
   */
  getStatus() {
    const status = {
      total_tasks: this.jobs.size,
      tasks: []
    };
    
    for (const [id, job] of this.jobs.entries()) {
      status.tasks.push({
        id,
        type: job.type || 'cron',
        running: job.running || false
      });
    }
    
    return status;
  }
}

export default Scheduler;
