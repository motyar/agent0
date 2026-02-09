# GitHub Copilot Agent Integration

## Overview

Agent0 now properly integrates with GitHub Copilot's coding agent by creating **GitHub issues** instead of pull requests. This allows the Copilot agent to autonomously implement code changes requested through the Telegram bot.

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

1. **New Method: `createTaskIssue()`** in `src/github-service.js`
   - Creates a GitHub issue with detailed task description
   - Automatically assigns to `@copilot` user
   - Adds appropriate labels for tracking

2. **Updated Tool: `createIssue`** in `src/bot.js`
   - Changed from `createPR` to `createIssue`
   - Updated system prompt to reflect new workflow
   - Maintains backward compatibility

3. **Updated Documentation**
   - README.md reflects issue-based workflow
   - soul.md updated for agent self-awareness

### Code Example

```javascript
// Create and assign issue to Copilot
const issue = await github.createTaskIssue({
  taskDescription: "Add user authentication endpoint",
  requestedBy: "username",
  userId: 12345
});

// Returns:
{
  success: true,
  issue_number: 42,
  issue_url: "https://github.com/motyar/agent0/issues/42"
}
```

## Requirements

### GitHub Copilot Access
To use this feature, you need:
- GitHub Copilot Pro, Pro+, Business, or Enterprise subscription
- Copilot agent enabled for your repository
- Write permissions to create issues and assign them

### Environment Variables
The following are already configured in `.github/workflows/agent.yml`:
- `GITHUB_TOKEN`: For GitHub API access
- `GITHUB_REPOSITORY`: For repo identification
- `TELEGRAM_BOT_TOKEN`: For Telegram integration
- `OPENAI_API_KEY`: For Agent0's AI capabilities

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
- 🚀 **Faster Development**: Autonomous code implementation
- 🎯 **Clear Tracking**: Issues provide better task visibility
- 💬 **Natural Language**: Just describe what you want in plain English
- 🔄 **Async Workflow**: Request and come back later to review

### For the System
- 📊 **Better Traceability**: Issues capture the full context
- 🤖 **Proper Integration**: Uses GitHub's native Copilot workflow
- 🔧 **Maintainable**: Cleaner separation of concerns
- ✅ **Reliable**: Follows GitHub's recommended approach

## Future Enhancements

Possible improvements:
- Webhook integration for real-time PR notifications
- Custom Copilot agent instructions in `.github/copilot-instructions.md`
- Priority levels for urgent vs normal tasks
- Integration with GitHub Projects for better task management

## References

- [GitHub Copilot Coding Agent Documentation](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent)
- [Assigning Issues to Copilot](https://github.blog/ai-and-ml/github-copilot/assigning-and-completing-issues-with-coding-agent-in-github-copilot/)
- [Custom Agents Configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)

---

**Version**: 2.0.0  
**Last Updated**: 2026-02-09  
**Status**: ✅ Active and Working
