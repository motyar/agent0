# Task Queue System Documentation

## Overview

Agent0 now includes a comprehensive asynchronous task queue system that allows the bot to handle complex, long-running operations in the background while maintaining responsiveness to users.

## Architecture

```
┌─────────────────┐
│  User Message   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Agent0 Bot     │ ◄── Decides: Immediate response or create task?
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌──────────────┐
│Respond │  │ Create Task  │
│Directly│  │ in Queue     │
└────────┘  └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │ Task Queue   │
            │ (input.json) │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │   Process    │ ◄── GitHub Actions every 5 min
            │   One Task   │
            └──────┬───────┘
                   │
              ┌────┴────┐
              │         │
              ▼         ▼
         ┌─────────┐ ┌──────────┐
         │Success  │ │  Failed  │
         └────┬────┘ └────┬─────┘
              │           │
              └─────┬─────┘
                    │
                    ▼
            ┌──────────────┐
            │Output Queue  │
            │(output.json) │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │ Notify User  │
            │ via Telegram │
            └──────────────┘
```

## Components

### 1. TaskQueue Manager (`src/task-queue.js`)

The core queue management system that handles:
- **Task Creation**: Generates unique task IDs and stores tasks
- **State Management**: Tracks task status (pending → processing → completed/failed)
- **Result Storage**: Maintains output queue with task results
- **Cleanup**: Automatically removes old completed tasks

### 2. Task Types

The system supports multiple task types:

| Type | Description | Use Case |
|------|-------------|----------|
| `general` | General purpose tasks | Default, uses LLM to process |
| `code` | Code execution | Runs code in sandbox |
| `research` | Web search | Searches web for information |
| `skill` | Skill management | Install/manage skills |
| `memory` | Memory operations | Search and analyze past conversations |

### 3. Task Lifecycle

1. **Created** (`pending`): Task is added to queue
2. **Processing** (`processing`): Task is being worked on
3. **Completed** (`completed`): Task finished successfully
4. **Failed** (`failed`): Task encountered an error

### 4. Tools Available

Users can interact with the task queue through these tools:

- `create_task`: Create a new task for async processing
- `list_tasks`: View all tasks (filtered by status)
- `get_task_status`: Check status of a specific task

## Usage Examples

### Creating a Task

```javascript
// User: "Please analyze the repository and create a report"
// Bot creates a task using the create_task tool:
{
  userId: 12345,
  username: "john",
  chatId: 67890,
  description: "analyze the repository and create a report",
  type: "general",
  params: {}
}
```

### Listing Tasks

```javascript
// User: "Show my tasks"
// Bot uses list_tasks tool to retrieve user's tasks
// Returns tasks with their status and details
```

### Checking Task Status

```javascript
// User: "What's the status of task-abc123?"
// Bot uses get_task_status tool
// Returns current status, timestamps, and any errors
```

## File Structure

```
queue/tasks/
├── input.json      # All tasks (pending, processing, completed, failed)
├── output.json     # Task results with metadata
└── current.json    # Currently processing task (for recovery)
```

### input.json Structure
```json
{
  "tasks": [
    {
      "id": "task-1707472800000-abc123",
      "userId": 12345,
      "username": "john",
      "chatId": 67890,
      "description": "Task description",
      "type": "general",
      "params": {},
      "status": "pending",
      "createdAt": "2026-02-09T08:00:00.000Z",
      "updatedAt": "2026-02-09T08:00:00.000Z"
    }
  ]
}
```

### output.json Structure
```json
{
  "results": [
    {
      "taskId": "task-1707472800000-abc123",
      "userId": 12345,
      "username": "john",
      "chatId": 67890,
      "description": "Task description",
      "result": {
        "success": true,
        "message": "Task completed successfully"
      },
      "success": true,
      "completedAt": "2026-02-09T08:05:00.000Z",
      "duration": 300
    }
  ]
}
```

## Integration with Memory

All task activity is automatically saved to the agent's memory system:

- **Task Creation**: Logged when task is created
- **Task Completion**: Result is saved to memory
- **Task Failure**: Error is logged to memory

This ensures the agent can recall past task activity in future conversations.

## GitHub Actions Integration

The workflow (`.github/workflows/agent.yml`) includes:

1. **Message Processing**: Handles incoming Telegram messages
2. **Task Processing**: Processes one pending task per run
3. **State Persistence**: Commits task queue state to Git

## Best Practices

### When to Use Tasks

**Use tasks for:**
- Long-running operations (code execution, web scraping)
- Complex analysis or research
- Operations that might timeout
- Background processing

**Respond immediately for:**
- Simple questions
- Quick information lookup
- Conversations
- Status checks

### Error Handling

Tasks include comprehensive error handling:
- Failures are logged with error messages
- Users are notified of failures
- Failed tasks are kept in history for debugging

### Performance

- Tasks are processed sequentially (one at a time)
- Old completed tasks are automatically cleaned up (keeps last 50)
- Output queue maintains last 100 results

## Testing

Run the test suite:
```bash
npm test
```

The test suite includes:
- Task creation and queuing
- Status transitions
- Completion and failure handling
- Result retrieval
- Statistics calculation
- Cleanup operations

## Future Enhancements

Potential improvements:
- Priority queuing
- Scheduled tasks
- Task dependencies
- Parallel processing for certain task types
- Task progress updates
- Task cancellation
