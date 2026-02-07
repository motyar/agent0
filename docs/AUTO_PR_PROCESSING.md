# Auto-Processing Bot PRs

## Overview

Agent0 includes an automated PR processing system that creates a complete automation loop from Telegram bot requests to code implementation. When a user requests a task through the Telegram bot, the system automatically creates a PR, implements the task, and merges the changes.

## How It Works

### Complete Flow

1. **User Request** → User sends task request via Telegram
2. **Bot Creates PR** → Agent0 creates a new PR with `bot-task` label
3. **Workflow Triggers** → Auto-process workflow detects new PR
4. **Agent Processes Task** → Agent reads task and implements changes
5. **Commit & Push** → Changes are committed to PR branch
6. **Auto-Merge** → PR is automatically merged when checks pass

### Architecture

```
┌─────────────┐
│  Telegram   │
│    User     │
└──────┬──────┘
       │
       │ "Create PR to add X feature"
       │
       ▼
┌─────────────────┐
│  Agent0 Bot     │
│  (GitHub Action)│
└──────┬──────────┘
       │
       │ Creates PR with bot-task label
       │
       ▼
┌───────────────────┐
│  Auto-Process     │
│  Workflow         │
│  (Triggered)      │
└──────┬────────────┘
       │
       │ Runs: node src/agent.js process-pr <PR#>
       │
       ▼
┌───────────────────┐
│  Agent0           │
│  Implementation   │
│  - Fetches PR     │
│  - Parses task    │
│  - Uses OpenAI    │
│  - Creates files  │
└──────┬────────────┘
       │
       │ Commits and pushes
       │
       ▼
┌───────────────────┐
│  Auto-Merge       │
│  (When checks pass)│
└───────────────────┘
```

## Workflow Details

### Trigger Conditions

The auto-process workflow (`auto-process-bot-prs.yml`) triggers when:
- Event type: `pull_request` with types `opened` or `synchronize`
- Creator: `github-actions[bot]`
- Label: `bot-task` is present

### Steps

1. **Checkout PR Branch**
   - Checks out the PR's head branch
   - Uses `GITHUB_TOKEN` for authentication
   - Fetches full git history

2. **Setup Environment**
   - Installs Node.js 22
   - Installs npm dependencies

3. **Extract Task**
   - Uses GitHub CLI to fetch PR body
   - Extracts task description from `**Task:** <description>` format
   - Makes it available to subsequent steps

4. **Process Task with Agent**
   - Runs `node src/agent.js process-pr <PR#>`
   - Agent uses OpenAI to understand and implement the task
   - Creates or modifies files as needed

5. **Commit Changes**
   - Configures git user as "Agent0 Bot"
   - Stages all changes with `git add -A`
   - Commits with descriptive message
   - Pushes to PR branch

6. **Update PR**
   - Posts comment with implementation status
   - Indicates whether changes were made

7. **Enable Auto-Merge**
   - Enables auto-merge with squash strategy
   - PR will merge automatically when all checks pass

## Agent Processing Logic

The `processPR` function in `src/agent.js`:

1. **Fetches PR Details**
   ```javascript
   const { data: pr } = await octokit.pulls.get({
     owner, repo, pull_number: prNumber
   });
   ```

2. **Extracts Task**
   - Parses PR body for `**Task:** <description>`
   - Falls back to `TASK_DESCRIPTION` environment variable

3. **Uses OpenAI**
   - Sends task to GPT-4
   - Gets structured response with file operations
   - Response format:
     ```json
     {
       "analysis": "What needs to be done",
       "files": [
         {
           "path": "file/path.ext",
           "action": "create|modify",
           "content": "file content"
         }
       ]
     }
     ```

4. **Implements Changes**
   - Creates necessary directories
   - Writes files to filesystem
   - Logs all operations

## Configuration

### Required Secrets

- `GITHUB_TOKEN` - Provided automatically by GitHub Actions
- `OPENAI_API_KEY` - Your OpenAI API key (must be configured)

### Environment Variables

- `GITHUB_REPOSITORY` - Format: `owner/repo` (auto-set by GitHub)
- `PR_NUMBER` - PR number being processed (auto-set by workflow)
- `TASK_DESCRIPTION` - Fallback task description (auto-set by workflow)

## Troubleshooting

### Workflow Not Triggering

**Problem:** Auto-process workflow doesn't run for a PR

**Solutions:**
1. Verify PR was created by `github-actions[bot]`
2. Check that `bot-task` label is present
3. Review workflow file for syntax errors
4. Check GitHub Actions permissions in repo settings

### Task Extraction Fails

**Problem:** Cannot extract task from PR body

**Solutions:**
1. Ensure PR body contains `**Task:** <description>` format
2. Check that task description is on the line after `**Task:**`
3. Verify PR body is not empty

### OpenAI API Errors

**Problem:** Agent fails to process task with API error

**Solutions:**
1. Verify `OPENAI_API_KEY` secret is set correctly
2. Check OpenAI API status and rate limits
3. Review API error message in workflow logs
4. Ensure sufficient API credits/quota

### No Changes Committed

**Problem:** Workflow runs but no changes appear in PR

**Solutions:**
1. Check workflow logs for agent implementation output
2. Verify OpenAI response includes file operations
3. Review agent error messages
4. Check file paths are valid relative to repo root

### Auto-Merge Fails

**Problem:** PR doesn't merge automatically

**Solutions:**
1. Verify all required checks pass
2. Check branch protection rules
3. Ensure repository allows auto-merge
4. Review PR merge conflicts

## Disabling Auto-Processing

If you need to temporarily disable auto-processing:

### Option 1: Pause Workflow

1. Go to `.github/workflows/auto-process-bot-prs.yml`
2. Change `on:` trigger to empty or comment it out:
   ```yaml
   on: []  # Disabled
   ```

### Option 2: Modify Condition

Edit the `if:` condition to always return false:
```yaml
if: false  # Temporarily disabled
```

### Option 3: Disable from UI

1. Go to repository Settings → Actions → General
2. Disable "Allow GitHub Actions to create and approve pull requests"

### Option 4: Remove Label

Remove the `bot-task` label from existing PRs to prevent processing.

## Testing

### Manual Testing

1. Create a test PR with `bot-task` label
2. Add task in PR body: `**Task:** Create a test file`
3. Ensure creator is `github-actions[bot]` or manually trigger
4. Watch workflow run in Actions tab
5. Verify implementation in PR

### Test Cases

The implementation handles:

- ✅ Simple tasks (e.g., "create a README file")
- ✅ Complex tasks (e.g., "add a new API endpoint")
- ✅ Multiple file operations
- ✅ Directory creation
- ✅ Edge cases (empty tasks, malformed PR bodies)
- ✅ Failures (API errors, invalid tasks)

### Expected Behavior

**Successful Run:**
```
✅ Task processed by Agent0
Status: Implementation complete
Changes: true
Ready for review and merge! 🚀
```

**No Changes Needed:**
```
✅ Task processed by Agent0
Status: Implementation complete
Changes: false
ℹ️ No changes needed
```

**Error:**
```
❌ Error processing PR: [error message]
```

## Best Practices

1. **Task Descriptions**
   - Be specific and clear
   - Include context when needed
   - Mention file paths if relevant

2. **PR Review**
   - Review auto-implemented changes before merge
   - Add manual checks if needed
   - Verify code quality

3. **Security**
   - Never commit secrets
   - Review auto-generated code
   - Validate external inputs

4. **Monitoring**
   - Check workflow runs regularly
   - Monitor OpenAI API usage
   - Review merge conflicts

## Future Enhancements

Potential improvements:

- [ ] Add validation checks before merge
- [ ] Include automated tests in workflow
- [ ] Support multi-step tasks
- [ ] Add human approval gate for critical changes
- [ ] Implement rollback mechanism
- [ ] Add metrics and analytics
- [ ] Support for different AI models
- [ ] Integration with code review tools

## Related Documentation

- [GitHub Service](../src/github-service.js) - PR creation logic (already exists)
- [Task Parser](../src/task-parser.js) - Task extraction (already exists)
- [Agent Core](../src/agent.js) - Main agent logic
- [Process Messages Workflow](../.github/workflows/process-messages.yml) - Bot message handling

## Support

For issues or questions:
1. Check workflow logs in Actions tab
2. Review error messages in PR comments
3. Consult troubleshooting section above
4. Open an issue in the repository
