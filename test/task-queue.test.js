#!/usr/bin/env node

/**
 * Simple test suite for TaskQueue
 * Run with: node test/task-queue.test.js
 */

import TaskQueue from '../src/task-queue.js';
import fs from 'fs/promises';

async function cleanup() {
  try {
    await fs.rm('queue/tasks', { recursive: true, force: true });
  } catch (err) {
    // Ignore errors
  }
}

async function runTests() {
  console.log('🧪 Testing TaskQueue...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Clean up before tests
  await cleanup();
  
  const queue = new TaskQueue();
  
  // Test 1: Initialize
  try {
    await queue.initialize();
    console.log('✅ Test 1: Initialize');
    passed++;
  } catch (err) {
    console.error('❌ Test 1: Initialize -', err.message);
    failed++;
  }
  
  // Test 2: Enqueue a task
  let taskId;
  try {
    const task = await queue.enqueueTask({
      userId: 12345,
      username: 'testuser',
      chatId: 67890,
      description: 'Test task for validation',
      type: 'general',
      params: { test: true }
    });
    
    if (task.id && task.status === 'pending') {
      taskId = task.id;
      console.log('✅ Test 2: Enqueue task');
      passed++;
    } else {
      throw new Error('Invalid task created');
    }
  } catch (err) {
    console.error('❌ Test 2: Enqueue task -', err.message);
    failed++;
  }
  
  // Test 3: Get next task
  try {
    const nextTask = await queue.getNextTask();
    if (nextTask && nextTask.id === taskId) {
      console.log('✅ Test 3: Get next task');
      passed++;
    } else {
      throw new Error('Next task not found');
    }
  } catch (err) {
    console.error('❌ Test 3: Get next task -', err.message);
    failed++;
  }
  
  // Test 4: Mark task as processing
  try {
    await queue.markTaskProcessing(taskId);
    const task = await queue.getTask(taskId);
    if (task.status === 'processing') {
      console.log('✅ Test 4: Mark task as processing');
      passed++;
    } else {
      throw new Error(`Expected status 'processing', got '${task.status}'`);
    }
  } catch (err) {
    console.error('❌ Test 4: Mark task as processing -', err.message);
    failed++;
  }
  
  // Test 5: Complete task
  try {
    await queue.completeTask(taskId, {
      success: true,
      message: 'Test completed successfully'
    });
    
    const task = await queue.getTask(taskId);
    if (task.status === 'completed') {
      console.log('✅ Test 5: Complete task');
      passed++;
    } else {
      throw new Error(`Expected status 'completed', got '${task.status}'`);
    }
  } catch (err) {
    console.error('❌ Test 5: Complete task -', err.message);
    failed++;
  }
  
  // Test 6: Get results
  try {
    const results = await queue.getResults(12345, 10);
    if (results.length > 0 && results[0].taskId === taskId) {
      console.log('✅ Test 6: Get results');
      passed++;
    } else {
      throw new Error('Results not found');
    }
  } catch (err) {
    console.error('❌ Test 6: Get results -', err.message);
    failed++;
  }
  
  // Test 7: Get stats
  try {
    const stats = await queue.getStats();
    if (stats.total === 1 && stats.completed === 1) {
      console.log('✅ Test 7: Get stats');
      passed++;
    } else {
      throw new Error(`Unexpected stats: ${JSON.stringify(stats)}`);
    }
  } catch (err) {
    console.error('❌ Test 7: Get stats -', err.message);
    failed++;
  }
  
  // Test 8: Enqueue and fail a task
  try {
    const task = await queue.enqueueTask({
      userId: 12345,
      username: 'testuser',
      chatId: 67890,
      description: 'Task to be failed',
      type: 'general'
    });
    
    await queue.markTaskProcessing(task.id);
    await queue.failTask(task.id, 'Test error message');
    
    const failedTask = await queue.getTask(task.id);
    if (failedTask.status === 'failed' && failedTask.error === 'Test error message') {
      console.log('✅ Test 8: Fail task');
      passed++;
    } else {
      throw new Error('Task not marked as failed correctly');
    }
  } catch (err) {
    console.error('❌ Test 8: Fail task -', err.message);
    failed++;
  }
  
  // Test 9: Get user tasks
  try {
    const userTasks = await queue.getUserTasks(12345);
    if (userTasks.length === 2) {
      console.log('✅ Test 9: Get user tasks');
      passed++;
    } else {
      throw new Error(`Expected 2 user tasks, got ${userTasks.length}`);
    }
  } catch (err) {
    console.error('❌ Test 9: Get user tasks -', err.message);
    failed++;
  }
  
  // Test 10: Get current task (should be null)
  try {
    const currentTask = await queue.getCurrentTask();
    if (currentTask === null) {
      console.log('✅ Test 10: Get current task (none)');
      passed++;
    } else {
      throw new Error('Expected no current task');
    }
  } catch (err) {
    console.error('❌ Test 10: Get current task -', err.message);
    failed++;
  }
  
  // Clean up after tests
  await cleanup();
  
  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);
  console.log(`Total Tests: ${passed + failed}`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
