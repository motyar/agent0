import Scheduler from '../scheduler.js';
import { jest } from '@jest/globals';

describe('Scheduler', () => {
  let scheduler;
  let consoleSpy;

  beforeEach(() => {
    scheduler = new Scheduler();
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation()
    };
  });

  afterEach(() => {
    if (scheduler && scheduler.jobs) {
      scheduler.stop();
    }
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('initialization', () => {
    test('should initialize with empty jobs map', () => {
      expect(scheduler.jobs).toBeInstanceOf(Map);
      expect(scheduler.jobs.size).toBe(0);
    });

    test('should set config path correctly', () => {
      expect(scheduler.configPath).toBe('config/scheduler.json');
    });

    test('should initialize and load config from file', async () => {
      await scheduler.initialize();

      expect(consoleSpy.log).toHaveBeenCalledWith('⏰ Initializing scheduler...');
      // The actual config file exists, so it should load successfully
      expect(scheduler.jobs.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('loadConfig', () => {
    test('should return a valid config object', async () => {
      const config = await scheduler.loadConfig();

      expect(config).toHaveProperty('cron_jobs');
      expect(config).toHaveProperty('wakeup_tasks');
      expect(Array.isArray(config.cron_jobs)).toBe(true);
      expect(Array.isArray(config.wakeup_tasks)).toBe(true);
    });
  });

  describe('registerCronJob', () => {
    test('should register enabled cron job', () => {
      const jobConfig = {
        id: 'test_job',
        schedule: '0 0 * * *',
        enabled: true,
        task: { type: 'health_check', params: {} }
      };

      scheduler.registerCronJob(jobConfig);

      expect(scheduler.jobs.has('test_job')).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '✅ Registered cron job: test_job (0 0 * * *)'
      );
    });

    test('should skip disabled cron job', () => {
      const jobConfig = {
        id: 'disabled_job',
        schedule: '0 0 * * *',
        enabled: false,
        task: { type: 'health_check', params: {} }
      };

      scheduler.registerCronJob(jobConfig);

      expect(scheduler.jobs.has('disabled_job')).toBe(false);
      expect(consoleSpy.log).toHaveBeenCalledWith('⏭️  Skipping disabled job: disabled_job');
    });

    test('should handle invalid cron schedule', () => {
      const jobConfig = {
        id: 'invalid_job',
        schedule: 'not-a-valid-schedule',
        enabled: true,
        task: { type: 'health_check', params: {} }
      };

      scheduler.registerCronJob(jobConfig);

      expect(scheduler.jobs.has('invalid_job')).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Failed to register cron job invalid_job:'),
        expect.any(String)
      );
    });
  });

  describe('registerWakeupTask', () => {
    test('should skip disabled wakeup task', () => {
      const taskConfig = {
        id: 'disabled_wakeup',
        trigger_time: new Date(Date.now() + 1000).toISOString(),
        enabled: false,
        task: { type: 'custom', handler: 'test', params: {} }
      };

      scheduler.registerWakeupTask(taskConfig);

      expect(scheduler.jobs.has('disabled_wakeup')).toBe(false);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '⏭️  Skipping disabled wakeup task: disabled_wakeup'
      );
    });

    test('should register wakeup task with future trigger time', () => {
      const futureTime = new Date(Date.now() + 10000).toISOString();
      const taskConfig = {
        id: 'future_wakeup',
        trigger_time: futureTime,
        enabled: true,
        task: { type: 'custom', handler: 'test', params: {} }
      };

      scheduler.registerWakeupTask(taskConfig);

      expect(scheduler.jobs.has('future_wakeup')).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        `✅ Registered wakeup task: future_wakeup (${futureTime})`
      );
    });

    test('should skip wakeup task with past trigger time beyond grace period', () => {
      const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      const taskConfig = {
        id: 'past_wakeup',
        trigger_time: pastTime,
        enabled: true,
        task: { type: 'custom', handler: 'test', params: {} }
      };

      scheduler.registerWakeupTask(taskConfig);

      expect(scheduler.jobs.has('past_wakeup')).toBe(false);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '⚠️  Wakeup task past_wakeup trigger time has passed grace period, skipping'
      );
    });
  });

  describe('executeTask', () => {
    test('should execute self_analysis task', async () => {
      const task = { type: 'self_analysis', params: { depth: 'full' } };

      await scheduler.executeTask(task);

      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 Running self-analysis...');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Self-analysis complete');
    });

    test('should execute memory_cleanup task', async () => {
      const task = { type: 'memory_cleanup', params: { max_age_days: 90 } };

      await scheduler.executeTask(task);

      expect(consoleSpy.log).toHaveBeenCalledWith('🧹 Running memory cleanup...');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Memory cleanup complete');
    });

    test('should execute health_check task', async () => {
      const task = { type: 'health_check', params: {} };

      await scheduler.executeTask(task);

      expect(consoleSpy.log).toHaveBeenCalledWith('🏥 Running health check...');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Health check complete');
    });

    test('should execute custom task', async () => {
      const task = { type: 'custom', handler: 'test_handler', params: { key: 'value' } };

      await scheduler.executeTask(task);

      expect(consoleSpy.log).toHaveBeenCalledWith('⚙️  Running custom task: test_handler');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Custom task complete');
    });

    test('should handle unknown task type', async () => {
      const task = { type: 'unknown_type', params: {} };

      await scheduler.executeTask(task);

      expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️  Unknown task type: unknown_type');
    });

    test('should handle task execution errors', async () => {
      const task = { type: 'health_check', params: {} };
      // Mock the runHealthCheck to throw an error
      const originalMethod = scheduler.runHealthCheck;
      scheduler.runHealthCheck = jest.fn().mockRejectedValue(new Error('Task failed'));

      await scheduler.executeTask(task);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '❌ Task execution failed:',
        'Task failed'
      );

      // Restore
      scheduler.runHealthCheck = originalMethod;
    });
  });

  describe('task runners', () => {
    test('runSelfAnalysis should log correctly', async () => {
      await scheduler.runSelfAnalysis({ depth: 'full' });

      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 Running self-analysis...');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Self-analysis complete');
    });

    test('runMemoryCleanup should log correctly', async () => {
      await scheduler.runMemoryCleanup({ max_age_days: 90 });

      expect(consoleSpy.log).toHaveBeenCalledWith('🧹 Running memory cleanup...');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Memory cleanup complete');
    });

    test('runHealthCheck should log correctly', async () => {
      await scheduler.runHealthCheck({});

      expect(consoleSpy.log).toHaveBeenCalledWith('🏥 Running health check...');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Health check complete');
    });

    test('runCustomTask should log correctly', async () => {
      await scheduler.runCustomTask('morning_routine', { greeting: 'Good morning!' });

      expect(consoleSpy.log).toHaveBeenCalledWith('⚙️  Running custom task: morning_routine');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Custom task complete');
    });
  });

  describe('stop', () => {
    test('should stop all cron jobs', () => {
      // Register a test job first
      scheduler.registerCronJob({
        id: 'test_job',
        schedule: '0 0 * * *',
        enabled: true,
        task: { type: 'health_check', params: {} }
      });

      expect(scheduler.jobs.size).toBeGreaterThan(0);
      
      scheduler.stop();

      expect(scheduler.jobs.size).toBe(0);
      expect(consoleSpy.log).toHaveBeenCalledWith('🛑 Stopping scheduler...');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Scheduler stopped');
    });

    test('should clear all wakeup task timeouts', () => {
      const futureTime = new Date(Date.now() + 10000).toISOString();
      
      scheduler.registerWakeupTask({
        id: 'wakeup_task',
        trigger_time: futureTime,
        enabled: true,
        task: { type: 'custom', handler: 'test', params: {} }
      });

      expect(scheduler.jobs.has('wakeup_task')).toBe(true);

      scheduler.stop();

      expect(scheduler.jobs.size).toBe(0);
    });
  });

  describe('getStatus', () => {
    test('should return status with no tasks', () => {
      const status = scheduler.getStatus();

      expect(status).toHaveProperty('total_tasks');
      expect(status).toHaveProperty('tasks');
      expect(status.total_tasks).toBe(0);
      expect(status.tasks).toEqual([]);
    });

    test('should return status with tasks', () => {
      scheduler.registerCronJob({
        id: 'cron_job',
        schedule: '0 0 * * *',
        enabled: true,
        task: { type: 'health_check', params: {} }
      });

      const futureTime = new Date(Date.now() + 10000).toISOString();
      scheduler.registerWakeupTask({
        id: 'wakeup_task',
        trigger_time: futureTime,
        enabled: true,
        task: { type: 'custom', handler: 'test', params: {} }
      });

      const status = scheduler.getStatus();

      expect(status.total_tasks).toBe(2);
      expect(status.tasks).toHaveLength(2);
      expect(status.tasks.some(t => t.id === 'cron_job')).toBe(true);
      expect(status.tasks.some(t => t.id === 'wakeup_task')).toBe(true);
    });
  });

  describe('integration tests', () => {
    test('should handle complete lifecycle', async () => {
      // Initialize
      await scheduler.initialize();
      const initialSize = scheduler.jobs.size;
      expect(initialSize).toBeGreaterThanOrEqual(0);

      // Get status
      const status = scheduler.getStatus();
      expect(status.total_tasks).toBe(initialSize);

      // Stop
      scheduler.stop();
      expect(scheduler.jobs.size).toBe(0);
    });

    test('should register multiple job types', () => {
      // Register cron job
      scheduler.registerCronJob({
        id: 'health_check',
        schedule: '*/15 * * * *',
        enabled: true,
        task: { type: 'health_check', params: {} }
      });

      // Register wakeup task
      const futureTime = new Date(Date.now() + 10000).toISOString();
      scheduler.registerWakeupTask({
        id: 'future_wakeup',
        trigger_time: futureTime,
        enabled: true,
        task: { type: 'custom', handler: 'morning_routine', params: {} }
      });

      expect(scheduler.jobs.size).toBe(2);
      expect(scheduler.jobs.has('health_check')).toBe(true);
      expect(scheduler.jobs.has('future_wakeup')).toBe(true);
    });

    test('should skip disabled jobs during registration', () => {
      scheduler.registerCronJob({
        id: 'enabled_job',
        schedule: '0 0 * * *',
        enabled: true,
        task: { type: 'health_check', params: {} }
      });

      scheduler.registerCronJob({
        id: 'disabled_job',
        schedule: '0 0 * * *',
        enabled: false,
        task: { type: 'self_analysis', params: {} }
      });

      const futureTime = new Date(Date.now() + 10000).toISOString();
      scheduler.registerWakeupTask({
        id: 'enabled_wakeup',
        trigger_time: futureTime,
        enabled: true,
        task: { type: 'custom', handler: 'test', params: {} }
      });

      scheduler.registerWakeupTask({
        id: 'disabled_wakeup',
        trigger_time: futureTime,
        enabled: false,
        task: { type: 'custom', handler: 'test2', params: {} }
      });

      // Should only have 2 enabled tasks
      expect(scheduler.jobs.size).toBe(2);
      expect(scheduler.jobs.has('enabled_job')).toBe(true);
      expect(scheduler.jobs.has('disabled_job')).toBe(false);
      expect(scheduler.jobs.has('enabled_wakeup')).toBe(true);
      expect(scheduler.jobs.has('disabled_wakeup')).toBe(false);
    });
  });
});
