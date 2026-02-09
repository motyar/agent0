import fs from 'fs/promises';
import path from 'path';

/**
 * TaskQueue manages asynchronous task processing
 * Tasks are queued, processed one by one, and results are stored
 */
class TaskQueue {
  constructor() {
    this.tasksPath = 'queue/tasks';
    this.inputQueuePath = path.join(this.tasksPath, 'input.json');
    this.outputQueuePath = path.join(this.tasksPath, 'output.json');
    this.currentTaskPath = path.join(this.tasksPath, 'current.json');
  }

  /**
   * Initialize task queue directories and files
   */
  async initialize() {
    await fs.mkdir(this.tasksPath, { recursive: true });
    
    // Initialize input queue if doesn't exist
    try {
      await fs.access(this.inputQueuePath);
    } catch {
      await this.saveInputQueue({ tasks: [] });
    }
    
    // Initialize output queue if doesn't exist
    try {
      await fs.access(this.outputQueuePath);
    } catch {
      await this.saveOutputQueue({ results: [] });
    }
    
    console.log('📋 Task queue initialized');
  }

  /**
   * Add a new task to the input queue
   */
  async enqueueTask(task) {
    const queue = await this.loadInputQueue();
    
    const newTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: task.userId,
      username: task.username,
      chatId: task.chatId,
      description: task.description,
      type: task.type || 'general',
      params: task.params || {},
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    queue.tasks.push(newTask);
    await this.saveInputQueue(queue);
    
    console.log(`📥 Task enqueued: ${newTask.id} (${newTask.description})`);
    return newTask;
  }

  /**
   * Get the next pending task from the queue
   */
  async getNextTask() {
    const queue = await this.loadInputQueue();
    const pendingTasks = queue.tasks.filter(t => t.status === 'pending');
    
    if (pendingTasks.length === 0) {
      return null;
    }
    
    // Get oldest pending task
    return pendingTasks[0];
  }

  /**
   * Mark a task as processing
   */
  async markTaskProcessing(taskId) {
    const queue = await this.loadInputQueue();
    const task = queue.tasks.find(t => t.id === taskId);
    
    if (task) {
      task.status = 'processing';
      task.updatedAt = new Date().toISOString();
      task.startedAt = new Date().toISOString();
      await this.saveInputQueue(queue);
      
      // Save as current task
      await this.saveCurrentTask(task);
      console.log(`⚙️  Task processing: ${taskId}`);
    }
  }

  /**
   * Complete a task and move result to output queue
   */
  async completeTask(taskId, result) {
    const queue = await this.loadInputQueue();
    const taskIndex = queue.tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      console.error(`Task not found: ${taskId}`);
      return;
    }
    
    const task = queue.tasks[taskIndex];
    task.status = 'completed';
    task.updatedAt = new Date().toISOString();
    task.completedAt = new Date().toISOString();
    
    await this.saveInputQueue(queue);
    
    // Add result to output queue
    const outputQueue = await this.loadOutputQueue();
    outputQueue.results.push({
      taskId: taskId,
      userId: task.userId,
      username: task.username,
      chatId: task.chatId,
      description: task.description,
      result: result,
      success: true,
      completedAt: new Date().toISOString(),
      duration: task.startedAt ? 
        (new Date(task.completedAt) - new Date(task.startedAt)) / 1000 : null
    });
    
    // Keep last 100 results
    if (outputQueue.results.length > 100) {
      outputQueue.results = outputQueue.results.slice(-100);
    }
    
    await this.saveOutputQueue(outputQueue);
    
    // Clear current task
    await this.clearCurrentTask();
    
    console.log(`✅ Task completed: ${taskId}`);
  }

  /**
   * Mark a task as failed
   */
  async failTask(taskId, error) {
    const queue = await this.loadInputQueue();
    const task = queue.tasks.find(t => t.id === taskId);
    
    if (task) {
      task.status = 'failed';
      task.updatedAt = new Date().toISOString();
      task.failedAt = new Date().toISOString();
      task.error = error;
      await this.saveInputQueue(queue);
      
      // Add to output queue as failed
      const outputQueue = await this.loadOutputQueue();
      outputQueue.results.push({
        taskId: taskId,
        userId: task.userId,
        username: task.username,
        chatId: task.chatId,
        description: task.description,
        result: null,
        success: false,
        error: error,
        completedAt: new Date().toISOString()
      });
      
      await this.saveOutputQueue(outputQueue);
      
      // Clear current task
      await this.clearCurrentTask();
      
      console.log(`❌ Task failed: ${taskId}`);
    }
  }

  /**
   * Get all tasks (optionally filtered by status)
   */
  async getTasks(status = null) {
    const queue = await this.loadInputQueue();
    
    if (status) {
      return queue.tasks.filter(t => t.status === status);
    }
    
    return queue.tasks;
  }

  /**
   * Get tasks for a specific user
   */
  async getUserTasks(userId, status = null) {
    const queue = await this.loadInputQueue();
    let tasks = queue.tasks.filter(t => t.userId === userId);
    
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    
    return tasks;
  }

  /**
   * Get task by ID
   */
  async getTask(taskId) {
    const queue = await this.loadInputQueue();
    return queue.tasks.find(t => t.id === taskId);
  }

  /**
   * Get current processing task
   */
  async getCurrentTask() {
    try {
      const data = await fs.readFile(this.currentTaskPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Get results from output queue (optionally for specific user)
   */
  async getResults(userId = null, limit = 10) {
    const outputQueue = await this.loadOutputQueue();
    let results = outputQueue.results;
    
    if (userId) {
      results = results.filter(r => r.userId === userId);
    }
    
    // Return most recent results
    return results.slice(-limit).reverse();
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const queue = await this.loadInputQueue();
    
    return {
      total: queue.tasks.length,
      pending: queue.tasks.filter(t => t.status === 'pending').length,
      processing: queue.tasks.filter(t => t.status === 'processing').length,
      completed: queue.tasks.filter(t => t.status === 'completed').length,
      failed: queue.tasks.filter(t => t.status === 'failed').length
    };
  }

  /**
   * Clean up old completed tasks (keep last 50)
   */
  async cleanup() {
    const queue = await this.loadInputQueue();
    const completedTasks = queue.tasks.filter(t => t.status === 'completed' || t.status === 'failed');
    
    if (completedTasks.length > 50) {
      // Sort by completion time
      const sorted = completedTasks.sort((a, b) => {
        const timeA = new Date(a.completedAt || a.failedAt || a.updatedAt);
        const timeB = new Date(b.completedAt || b.failedAt || b.updatedAt);
        return timeA - timeB;
      });
      
      // Keep only last 50
      const toKeep = sorted.slice(-50);
      const toKeepIds = new Set(toKeep.map(t => t.id));
      
      // Filter tasks
      queue.tasks = queue.tasks.filter(t => 
        t.status === 'pending' || 
        t.status === 'processing' || 
        toKeepIds.has(t.id)
      );
      
      await this.saveInputQueue(queue);
      console.log('🧹 Cleaned up old tasks');
    }
  }

  // Private helper methods
  async loadInputQueue() {
    try {
      const data = await fs.readFile(this.inputQueuePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { tasks: [] };
    }
  }

  async saveInputQueue(queue) {
    await fs.writeFile(this.inputQueuePath, JSON.stringify(queue, null, 2));
  }

  async loadOutputQueue() {
    try {
      const data = await fs.readFile(this.outputQueuePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { results: [] };
    }
  }

  async saveOutputQueue(queue) {
    await fs.writeFile(this.outputQueuePath, JSON.stringify(queue, null, 2));
  }

  async saveCurrentTask(task) {
    await fs.writeFile(this.currentTaskPath, JSON.stringify(task, null, 2));
  }

  async clearCurrentTask() {
    try {
      await fs.unlink(this.currentTaskPath);
    } catch {
      // File doesn't exist, that's fine
    }
  }
}

export default TaskQueue;
