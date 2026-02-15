# 🤖 GitButler - Personal AI Assistant

**A self-aware AI assistant that lives entirely in your GitHub repository**

GitButler is a personal AI helper that runs on GitHub Actions, communicates via Telegram, and maintains persistent memory using Git. It's completely serverless, costs nothing beyond OpenAI API usage, and can even improve itself through code changes.

## ✨ Features

- 🧠 **Self-Aware**: Loads its own identity and memory before every response
- 💬 **Natural Language Only**: No slash commands or buttons - just chat naturally
- ⚡ **GitHub Actions Powered**: Runs every minute on free GitHub infrastructure
- 📝 **Persistent Memory**: Everything stored in Git (soul.md for identity & reflections)
- 🔄 **Self-Improving**: Can create issues/PRs to modify its own code
- 📅 **Scheduled Tasks**: Cron-based reminders and recurring prompts
- 🎯 **Skills System**: Extensible with markdown-based skill definitions
- 🔐 **Private**: All data stays in your repo, no external databases

## 🏗️ Architecture

```
User → Telegram → GitHub Actions (workflow dispatch) → GitButler → Response
                           ↓
                      Git commits (state, memory, soul)
```

### How It Works

1. **Fetch**: Directly fetches one new message from Telegram API (no queue)
2. **Check**: If no new messages, exits immediately
3. **Process**: Loads soul.md + skills, sends to GPT-4o-mini, gets response
4. **Send**: Sends response directly to Telegram (no queue)
5. **Act**: Handles actions (update soul, create issues/PRs, etc.)
6. **Track**: Updates last_message_id in state.json
7. **Commit**: Pushes all changes to Git

**Key Design Principles**:
- ✅ No message queues - direct API calls only
- ✅ Process one message per run
- ✅ Track last processed message_id
- ✅ Stop immediately if no new messages
- ✅ Simple function-based architecture (no classes)

## 📁 Repository Structure

```
agent0/
├── bot.py                      # Main Python script (function-based)
├── .github/workflows/
│   └── main.yml               # GitHub Actions workflow (workflow_dispatch)
├── storage/                   # Persistent context (OpenClaw pattern)
│   ├── soul.md                # Core personality & reflections
│   ├── IDENTITY.md            # Identity card (name, role, capabilities)
│   ├── USER.md                # User profile & preferences
│   ├── MEMORY.md              # Long-term episodic memory
│   ├── AGENTS.md              # Operating instructions & guidelines
│   ├── TOOLS.md               # Available tools & environment docs
│   └── state.json             # Last processed message_id, runtime state
└── skills/
    └── */skill.md             # Modular skill definitions
```

**Note**: The `queues/` directory has been removed - no more message queuing!

## 🚀 Quick Setup

### 1. Create Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Use `/newbot` command and follow instructions
3. Save your bot token
4. Get your chat ID by messaging your bot, then visit:
   `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   Look for `"chat":{"id":123456789}` in the response

### 2. Configure GitHub Secrets

Go to: **Settings → Secrets and variables → Actions → New repository secret**

Add these secrets (they are already configured for this repo):

- `OPENAI_API_KEY` - Your OpenAI API key
- `TELEGRAM_TOKEN` - Your Telegram bot token from BotFather
- `TELEGRAM_CHAT_ID` - Your Telegram user chat ID (as a string)
- `GITHUB_TOKEN` - Already available automatically

### 3. Enable GitHub Actions

The workflow is configured to run on `workflow_dispatch` (manual trigger).
You can trigger it manually or set up a schedule by adding a cron trigger to the workflow file.

### 4. Start Chatting!

Send a message to your Telegram bot. Then trigger the workflow to:
- Fetch your message directly from Telegram
- Load its soul and relevant skills
- Think using GPT-4o-mini
- Respond to you directly
- Commit the conversation to Git

**Note**: The bot processes ONE message per run and exits if no new messages are found.

## 💬 Usage Examples

Just chat naturally with your bot:

```
You: Hello! What can you do?
Bot: Hi! I'm GitButler, your personal AI assistant...

You: Remember that I prefer Python over JavaScript
Bot: I've noted your preference for Python...

You: Add "buy groceries" to my todo list
Bot: I've added "buy groceries" to your todo list...

You: Can you improve your error handling?
Bot: I'll create an issue for that improvement...
```

## 🧠 The Soul System (OpenClaw Pattern)

GitButler uses the **OpenClaw pattern** for self-awareness: separate markdown files for different aspects of identity and memory, making the bot truly self-aware and maintainable.

### Context Files (Loaded in Every Response)

All these files are loaded into the bot's context before every response, giving it persistent identity and knowledge:

| File | Purpose | Editable By |
|------|---------|-------------|
| **`storage/soul.md`** | Core personality, values, worldview, and reflections | Bot appends reflections, you can edit |
| **`storage/IDENTITY.md`** | Quick reference card: name, role, capabilities, version | You edit |
| **`storage/USER.md`** | Your profile: name, timezone, preferences, habits | Bot learns & updates, you can edit |
| **`storage/MEMORY.md`** | Long-term episodic memory: past conversations, facts learned | Bot appends entries, you can curate |
| **`storage/AGENTS.md`** | Operating instructions, tool usage guidelines, safety rails | You edit (comprehensive playbook) |
| **`storage/TOOLS.md`** | Available tools, environment docs, API references | You edit |
| **`skills/*/skill.md`** | Modular skill definitions injected when relevant | You create/edit |

### How It Works

1. **Loading Order**: SOUL → IDENTITY → USER → MEMORY → AGENTS → TOOLS → skills
2. **Self-Modification**: Bot can append to soul.md, memory.md, and user.md via JSON actions
3. **Why Markdown?** Human + bot readable, git-diff friendly, no schema migrations
4. **Inspired By**: [OpenClaw](https://github.com/cyanheads/openclaw) - self-hosted AI agent pattern

### Updating Context Files

The bot can update these files through JSON actions in its responses:

```json
{"update_soul": true, "content": "Reflection: I learned..."}
{"update_memory": true, "content": "User prefers concise answers"}
{"update_user": true, "content": "Timezone: UTC+1"}
```

This makes your bot feel "alive" and continuous — it remembers you and gets better over time.

## 📅 ~~Scheduled Tasks~~ (Removed)

The scheduled tasks feature has been removed to simplify the bot architecture. 
The bot now focuses solely on processing incoming messages one at a time.

## 🎨 Skills System

Create new skills in `skills/<name>/skill.md` with markdown content and optional YAML frontmatter.

## 🔧 Self-Improvement

GitButler can improve itself by creating GitHub issues with @copilot mentions for automated implementation.

## 📝 License

MIT

---

Made by [motyar](https://github.com/motyar)
