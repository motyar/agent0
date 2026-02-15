# Available Tools & Environment

## Python Environment
- **Version**: Python 3.x
- **Package Manager**: pip
- **Test Framework**: pytest
- **Key Libraries**:
  - openai>=1.0.0 (GPT-4o-mini API)
  - requests>=2.31.0 (Telegram Bot API, HTTP calls)
  - croniter>=2.0.0 (Cron expression parsing)

## Git & Version Control
- **Repository**: motyar/agent0
- **Default Branch**: main
- **CI/CD**: GitHub Actions (.github/workflows/main.yml)
- **Workflow**: Runs every 1 minute
- **Commands Available**:
  - `git add .` - Stage changes
  - `git commit -m "message"` - Commit changes
  - `git push` - Push to remote
  - All Git operations handled by bot.py's git_commit_push() method

## GitHub API
- **Access**: Via GITHUB_TOKEN secret
- **Capabilities**:
  - Create issues
  - Create pull requests
  - Merge pull requests
  - Read repository content
  - Trigger workflows
- **Rate Limits**: Generous for personal repos (5000 requests/hour)

## Telegram Bot API
- **Access**: Via TELEGRAM_TOKEN secret
- **Target Chat**: TELEGRAM_CHAT_ID secret
- **Methods Used**:
  - getUpdates (polling for new messages)
  - sendMessage (sending responses)
- **Update Mode**: Long polling with offset tracking

## OpenAI API
- **Model**: gpt-4o-mini
- **Access**: Via OPENAI_API_KEY secret
- **Parameters**:
  - temperature: 0.7 (balanced creativity)
  - max_tokens: 4000 (generous response length)
- **Cost**: ~$0.00015 per request (very economical)

## File System Structure
```
agent0/
├── bot.py                      # Main agent script
├── storage/                    # Persistent state (committed to Git)
│   ├── soul.md                # Core identity & reflections
│   ├── IDENTITY.md            # Quick reference card
│   ├── USER.md                # User profile
│   ├── MEMORY.md              # Long-term memory log
│   ├── AGENTS.md              # Operating instructions
│   ├── TOOLS.md               # This file
│   ├── schedules.json         # Cron-based scheduled tasks
│   └── state.json             # Runtime state (last poll offset)
└── skills/                    # Modular skill definitions
    └── */skill.md             # Individual skill files
```

## JSON Action Format
Actions are extracted from GPT-4o-mini responses via JSON blocks:

```json
{
  "update_soul": true,
  "content": "Reflection to append to soul.md"
}
```

```json
{
  "create_issue_for_copilot": true,
  "issue_title": "Implement feature X",
  "issue_body": "Detailed prompt. @copilot please create PR"
}
```

```json
{
  "generate_code": true,
  "files": [
    {"path": "bot.py", "content": "...full file content..."}
  ],
  "commit_msg": "Fix bug in message processing",
  "pr_title": "Bug Fix: Message Processing",
  "pr_body": "Fixes the issue with..."
}
```

```json
{
  "merge_pr": 123,
  "confirm": true
}
```

## Limitations & Constraints
- **No Real-Time**: 1-minute polling interval minimum
- **No External DB**: All state in Git repository
- **No Message Log Files**: Chat transcripts stay in-memory for the current run and are cleared when the action ends
- **No File Uploads**: Text-only Telegram messages
- **Token Limits**: 4000 max tokens per GPT response
- **Rate Limits**: 
  - GitHub API: 5000 requests/hour
  - Telegram: 30 messages/second (we send <1/min)
  - OpenAI: Tier-based, typically generous for gpt-4o-mini

## Custom Tools (via bot.py)
- `read_json()` - Read JSON file with default fallback
- `write_json()` - Write JSON with pretty formatting
- `git_commit_push()` - Commit and push changes to Git
- `log_error()` - Append error to soul.md with timestamp
- `load_skills()` - Load all skill.md files into string
- `handle_actions()` - Parse and execute JSON actions from GPT response

## Testing
- **Framework**: pytest
- **Test Files**: tests/test_bot.py
- **Run Tests**: `python -m pytest tests/ -v`
- **Coverage**: Basic initialization, file operations, skill loading
