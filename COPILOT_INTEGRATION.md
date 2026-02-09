# GitHub Copilot SDK Integration

## Overview

Agent0 now uses the **GitHub Copilot SDK** (`@github/copilot-sdk`) for AI-powered conversations and properly integrates with GitHub Copilot's coding agent by creating **GitHub issues** instead of pull requests. This allows the Copilot agent to autonomously implement code changes requested through the Telegram bot.

## Key Features

### 1. GitHub Copilot SDK for AI
Agent0 uses the GitHub Copilot SDK instead of direct OpenAI API calls:
- 🤖 **Native Copilot Integration**: Uses GitHub's official SDK for AI capabilities
- 🔐 **Simplified Authentication**: Authenticates via `GITHUB_TOKEN` (no separate API key needed)
- 🛠️ **Tool Support**: Built-in function calling for creating issues
- 🎯 **Model Selection**: Uses GPT-4o-mini model through the SDK

### 2. Copilot Coding Agent for Code Changes
For implementing code changes, Agent0 creates GitHub issues assigned to the Copilot coding agent:
- 📝 **Issue-Based Workflow**: Creates issues with clear task descriptions
- 🤝 **Auto-Assignment**: Issues are automatically assigned to `@copilot`
- 🚀 **Autonomous Implementation**: Copilot agent creates PRs automatically

## How It Works

### The Workflow

1. **User Request**: User asks Agent0 for a code change via Telegram
   ```
   "Can you add a new API endpoint for user authentication?"
   ```

2. **Issue Creation**: Agent0 creates a GitHub issue with:
   - Clear task description
   - Context about the request
   - Special labels: `bot-task` and `copilot-agent`

3. **Copilot Assignment**: The issue is automatically assigned to `@copilot`

4. **Autonomous Implementation**: GitHub Copilot agent:
   - Reads the issue description
   - Creates a new branch
   - Implements the requested changes
   - Runs tests and checks
   - Opens a pull request

5. **Notification**: Agent0 notifies the user with the issue link

6. **Review & Merge**: User reviews the Copilot-generated PR and merges when ready

## Why This Approach?

### Problem with Direct PR Creation
Previously, Agent0 was creating PRs directly. However, GitHub Copilot agent is **triggered by issue assignment**, not by PR creation. This meant:
- ❌ PRs were created but Copilot never processed them
- ❌ No automated code implementation
- ❌ Manual work was required

### Solution: Issue-Based Workflow
By creating issues and assigning them to Copilot:
- ✅ Copilot agent is properly triggered
- ✅ Full autonomous code implementation
- ✅ Automatic PR creation by Copilot
- ✅ Better task tracking and transparency

## Implementation Details

### Key Changes

1. **GitHub Copilot SDK Integration** in `src/bot.js`
   - Replaced direct OpenAI API calls with `@github/copilot-sdk`
   - Uses `CopilotClient` for session management
   - Authenticates via `GITHUB_TOKEN` environment variable
   - Processes conversations with GPT-4o-mini model

2. **Tool Definition: `createIssue`**
   - Defined as a Copilot SDK tool with handler function
   - Creates GitHub issues when code changes are requested
   - Automatically assigns to `@copilot` user
   - Adds appropriate labels for tracking

3. **Simplified Dependencies**
   - Removed `openai` package dependency
   - Added `@github/copilot-sdk` package
   - No need for separate `OPENAI_API_KEY`

### Code Example

```javascript
// Import Copilot SDK
import { CopilotClient } from '@github/copilot-sdk';

// Initialize client
const copilotClient = new CopilotClient();
await copilotClient.start();

// Define createIssue tool
const createIssueTool = {
  name: 'createIssue',
  description: 'Create a GitHub issue and assign it to Copilot agent',
  parameters: {
    type: 'object',
    properties: {
      taskDescription: { type: 'string' }
    }
  },
  handler: async (args) => {
    const result = await github.createTaskIssue({
      taskDescription: args.taskDescription,
      requestedBy: username,
      userId: userId
    });
    return {
      content: [{
        type: 'text',
        text: `✅ Issue created: ${result.issue_url}`
      }]
    };
  }
};

// Create session with tool
const session = await copilotClient.createSession({
  model: 'gpt-4o-mini',
  tools: [createIssueTool]
});

// Process conversation
const response = await session.sendAndWait({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]
});
```

## Requirements

### GitHub Copilot Access
To use this feature, you need:
- GitHub Copilot Pro, Pro+, Business, or Enterprise subscription (for AI capabilities via SDK)
- Copilot coding agent enabled for your repository (for code implementation)
- Write permissions to create issues and assign them

### Environment Variables
The following are configured in `.github/workflows/agent.yml`:
- `GITHUB_TOKEN`: For GitHub API access and Copilot SDK authentication (auto-provided by GitHub Actions)
- `GITHUB_REPOSITORY`: For repo identification
- `TELEGRAM_BOT_TOKEN`: For Telegram integration

**Note**: No `OPENAI_API_KEY` required! The Copilot SDK uses `GITHUB_TOKEN` for authentication.

## Usage Examples

### Example 1: Add a Feature
```
User: "Can you add a health check endpoint to the API?"

Agent0: "✅ I've created a GitHub issue and assigned it to Copilot agent!
         📝 Task: Add a health check endpoint to the API
         🔗 Issue Link: https://github.com/motyar/agent0/issues/X
         🤖 The GitHub Copilot agent will process this issue..."
```

### Example 2: Fix a Bug
```
User: "Please fix the memory leak in the session handler"

Agent0: "✅ I've created a GitHub issue and assigned it to Copilot agent!
         📝 Task: Fix the memory leak in the session handler
         🔗 Issue Link: https://github.com/motyar/agent0/issues/Y
         🤖 The GitHub Copilot agent will process this issue..."
```

### Example 3: Refactoring
```
User: "Can you refactor the bot.js file to use async/await consistently?"

Agent0: "✅ I've created a GitHub issue and assigned it to Copilot agent!
         📝 Task: Refactor bot.js to use async/await consistently
         🔗 Issue Link: https://github.com/motyar/agent0/issues/Z
         🤖 The GitHub Copilot agent will process this issue..."
```

## Monitoring and Troubleshooting

### Check Issue Status
1. Go to the GitHub repository
2. Navigate to the Issues tab
3. Look for issues with `bot-task` and `copilot-agent` labels
4. Check if Copilot is assigned and working on it

### If Copilot Doesn't Respond
- Verify Copilot agent is enabled for your repository
- Check that the `@copilot` user has access
- Ensure your Copilot subscription is active
- Manually assign the issue to `@copilot` if auto-assignment failed

### Common Issues
- **"Could not assign to Copilot"**: The issue is created but not assigned. Manually assign it to `@copilot` from the GitHub UI.
- **No PR created**: Check if Copilot agent is enabled and has the necessary permissions.

## Benefits

### For Users
- 🚀 **Faster Development**: Autonomous code implementation via Copilot coding agent
- 🎯 **Clear Tracking**: Issues provide better task visibility
- 💬 **Natural Language**: Just describe what you want in plain English
- 🔄 **Async Workflow**: Request and come back later to review
- 🔐 **Simplified Setup**: No separate OpenAI API key needed

### For the System
- 📊 **Better Traceability**: Issues capture the full context
- 🤖 **Proper Integration**: Uses GitHub's native Copilot SDK and workflow
- 🔧 **Maintainable**: Cleaner separation of concerns
- ✅ **Reliable**: Follows GitHub's recommended approach
- 💰 **Cost Efficient**: Uses GitHub Copilot subscription instead of separate OpenAI account

## Future Enhancements

Possible improvements:
- Webhook integration for real-time PR notifications
- Custom Copilot agent instructions in `.github/copilot-instructions.md`
- Priority levels for urgent vs normal tasks
- Integration with GitHub Projects for better task management

## References

- [GitHub Copilot SDK Official Repository](https://github.com/github/copilot-sdk)
- [GitHub Copilot SDK Documentation](https://github.com/github/copilot-sdk/blob/main/docs/getting-started.md)
- [GitHub Copilot Coding Agent Documentation](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent)
- [Assigning Issues to Copilot](https://github.blog/ai-and-ml/github-copilot/assigning-and-completing-issues-with-coding-agent-in-github-copilot/)
- [Building Agents with GitHub Copilot SDK](https://techcommunity.microsoft.com/blog/azuredevcommunityblog/building-agents-with-github-copilot-sdk-a-practical-guide-to-automated-tech-upda/4488948)

---

**Version**: 2.1.0  
**Last Updated**: 2026-02-09  
**Status**: ✅ Active - Using GitHub Copilot SDK
