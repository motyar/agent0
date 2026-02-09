# Quick Start: Using Task Queue

## For Users

### When to Use Tasks

Use tasks when you need the bot to:
- Run code or execute scripts
- Do web research
- Perform complex analysis
- Install skills or tools
- Search through conversation history

### Simple Examples

**Create a task:**
```
You: Can you analyze this code and find potential bugs?
     [paste code]

Bot: I've created a task to analyze your code!
     Task ID: task-abc123
     
     I'll notify you when it's complete.
```

**Check task status:**
```
You: What's the status of my tasks?

Bot: You have 2 tasks:
     1. Code analysis - Completed ✅
     2. Web research - Processing ⏳
```

**View completed task:**
```
You: Show me the results of task-abc123

Bot: Task completed! Here are the results:
     [detailed analysis]
```

## For Developers

### Quick Integration

```javascript
import TaskQueue from './src/task-queue.js';

const queue = new TaskQueue();
await queue.initialize();

// Create a task
const task = await queue.enqueueTask({
  userId: 12345,
  username: 'john',
  chatId: 67890,
  description: 'Process data',
  type: 'general',
  params: { data: 'value' }
});

// Check status
const status = await queue.getTask(task.id);
console.log(status.status); // 'pending', 'processing', 'completed', 'failed'

// Get results
const results = await queue.getResults(12345);
```

### Task Types

- `general` - Default, uses LLM
- `code` - Sandbox execution
- `research` - Web search
- `skill` - Skill management
- `memory` - Memory search

### API Reference

```javascript
// Enqueue a task
await queue.enqueueTask(taskData)

// Get next pending task
await queue.getNextTask()

// Mark as processing
await queue.markTaskProcessing(taskId)

// Complete task
await queue.completeTask(taskId, result)

// Fail task
await queue.failTask(taskId, errorMessage)

// Get task by ID
await queue.getTask(taskId)

// Get user tasks
await queue.getUserTasks(userId, status?)

// Get results
await queue.getResults(userId?, limit?)

// Get statistics
await queue.getStats()
```

## Testing

Run tests:
```bash
npm test
```

All tests should pass with output:
```
✅ Test 1: Initialize
✅ Test 2: Enqueue task
✅ Test 3: Get next task
...
✅ All tests passed!
```

## Troubleshooting

**Task stuck in "processing":**
- Check `queue/tasks/current.json`
- Review GitHub Actions logs
- Task may have timed out

**Task failed:**
- Check error message in task details
- Review task parameters
- Check system logs

**No tasks being processed:**
- Verify GitHub Actions workflow is enabled
- Check workflow runs in Actions tab
- Ensure `OPENAI_API_KEY` and `TELEGRAM_BOT_TOKEN` are set

## Learn More

- Full documentation: `docs/TASK_QUEUE.md`
- Architecture: `README.md`
- Tests: `test/task-queue.test.js`
