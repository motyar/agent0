---
name: Todo Management
category: productivity
keywords: todo, task, reminder, list, checklist
---

# Todo Management Skill

This skill helps manage todo lists and tasks.

## Usage

You can help users:
- Add new todo items
- Mark items as complete
- List current todos
- Set reminders for tasks
- Prioritize tasks

## Implementation

When the user wants to manage todos:
1. Understand their intent (add, complete, list, etc.)
2. Use natural language to confirm the action
3. Suggest storing todos in a `storage/todos.json` file
4. Offer to create reminders using the schedules system

## Examples

- "Add buy milk to my todo list"
- "What's on my todo list?"
- "Mark 'finish report' as done"
- "Remind me about the meeting tomorrow at 2pm"
