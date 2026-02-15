# 🤖 GitButler - Personal AI Assistant

**A self-aware AI assistant that lives entirely in your GitHub repository**

GitButler is a personal AI helper that runs on GitHub Actions, communicates via Telegram, and maintains persistent memory using Git. It's completely serverless, costs nothing beyond OpenAI API usage, and can even improve itself through code changes.

## ✨ Features

- 🧠 **Self-Aware**: Loads its own identity and memory before every response
- 💬 **Natural Language Only**: No slash commands or buttons - just chat naturally
- ⚡ **GitHub Actions Powered**: Runs every minute on free GitHub infrastructure
- 📝 **Persistent Memory**: Everything stored in Git (soul.md for identity & reflections)
- 🧾 **Per-Run Session Cache**: Message logs stay in memory for each action run and clear when it stops
- 🔄 **Self-Improving**: Can create issues/PRs to modify its own code
- 📅 **Scheduled Tasks**: Cron-based reminders and recurring prompts
- 🎯 **Skills System**: Extensible with markdown-based skill definitions
- 🔐 **Private**: All data stays in your repo, no external databases
- 🔄 **Continuous Mode**: Long-running mode with ~10 second response time

## 🚀 Continuous Mode (NEW!)

GitButler now supports **continuous mode** - a long-running operation mode that keeps the bot active and responsive with near-real-time responses (~10 second polling).

### How It Works

Instead of processing one message and exiting, continuous mode runs in a loop:

1. **Active Mode** (🟢): Polls Telegram every 10 seconds for new messages
2. **Idle Mode** (🟡): Polls every 30 seconds (low-power mode)
3. **Stopped Mode** (💤): Bot is sleeping, waiting for wake command

### User Control Commands

You can control the bot with special commands:

**Start the bot:**
- `start`
- `wake up`
- `wake`

**Stop the bot:**
- `stop`
- `sleep`
- `pause`

**Check status:**
- `status`

### Auto-Sleep Feature

The bot automatically goes to idle mode after **30 minutes of inactivity** to conserve GitHub Actions minutes. This prevents the bot from running indefinitely when not in use.

### Running Modes

GitButler supports two modes via the `RUN_MODE` environment variable:

- **`continuous`** (default): Long-running mode with ~10 second responses
- **`single`**: Process one message and exit (legacy mode)

### GitHub Actions Configuration

The workflow is configured with:
- **6-hour timeout**: Maximum GitHub Actions allows
- **5-minute schedule fallback**: Checks for messages if bot is stopped
- **Manual trigger**: You can start continuous mode manually via workflow_dispatch

### Usage Example

```
You: start
Bot: 👋 I'm awake and active! Ready to help.

You: What can you do?
Bot: [Responds in ~10 seconds]

You: status
Bot: 📊 Bot Status
     Mode: ACTIVE 🟢
     Uptime: 0:15:23
     Messages processed: 5
     Idle cycles: 0/180

You: stop
Bot: 💤 Going to sleep. Send 'start' or 'wake up' to reactivate me.
```

### Benefits

- **Near real-time**: ~10 second response time when active
- **Cost efficient**: Auto-sleeps when idle to save Actions minutes
- **Always available**: Can stay active for up to 6 hours
- **User controlled**: Start/stop anytime with simple commands
- **Conversational**: Natural back-and-forth chat experience

## 🏗️ Architecture

```
User → Telegram → GitHub Actions (workflow dispatch) → GitButler → Response
                           ↓
                      Git commits (state, memory, soul)
```

### How It Works

**Continuous Mode (Default):**
1. **Start**: Bot enters continuous loop checking for messages every 10 seconds
2. **Process**: When message arrives, loads context and sends to GPT-4o-mini
3. **Respond**: Sends response directly to Telegram
4. **Auto-sleep**: After 30 minutes of inactivity, switches to idle mode
5. **State**: Maintains active/idle/stopped state in storage/state.json

**Single Message Mode (Legacy):**
1. **Early Check**: Before installing any dependencies, checks Telegram API for new messages (lightweight)
2. **Exit Fast**: If no new messages, exits immediately without installing dependencies
3. **Fetch**: If updates exist, installs dependencies and fetches message details
4. **Process**: Loads soul.md + skills, sends to GPT-4o-mini, gets response
5. **Send**: Sends response directly to Telegram (no queue)
6. **Act**: Handles actions (update soul, create issues/PRs, etc.)
7. **Track**: Updates last_update_id in state.json
8. **Commit**: Pushes all changes to Git

**Key Design Principles**:
- ✅ **Continuous mode by default** for near real-time responses (~10 seconds)
- ✅ **Auto-sleep after 30 min idle** to conserve GitHub Actions minutes
- ✅ **User control commands** (start/stop/status) for manual control
- ✅ **State machine** (active/idle/stopped) persisted in Git
- ✅ Single message mode still available (RUN_MODE=single)
- ✅ No message queues - direct API calls only
- ✅ Track last processed update_id for Telegram offset
- ✅ Simple function-based architecture (no classes)

## 📁 Repository Structure

```
agent0/
├── bot.py                      # Main Python script (function-based)
├── check_updates.sh            # Early update checker (runs before dependencies)
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

Go to **Actions** tab in your repository and enable workflows if they're not already enabled.

### 4. Start the Bot

**Option A: Continuous Mode (Recommended)**
1. Go to **Actions** → **GitButler Agent** workflow
2. Click **Run workflow** → Select `continuous` mode
3. The bot will run for up to 6 hours or until stopped
4. Send a message to your bot - it will respond in ~10 seconds

**Option B: Single Message Mode**
1. Go to **Actions** → **GitButler Agent** workflow
2. Click **Run workflow** → Select `single` mode
3. Bot processes one message and exits

**Option C: Schedule (Automatic)**
The workflow runs every 5 minutes by default to check for new messages when the bot is stopped.

### 5. Start Chatting!

**Continuous mode:**
```
You: start
Bot: GitButler session started (sent once per run)

You: What's the weather?
Bot: [Responds in ~10 seconds]

You: status
Bot: 📊 Bot Status - Mode: ACTIVE 🟢

You: stop
Bot: 💤 Going to sleep. Send 'start' or 'wake up' to reactivate me.
```

**Single message mode:**
Send a message to your Telegram bot, then trigger the workflow to:
- Fetch your message directly from Telegram
- Load its soul and relevant skills
- Think using GPT-4o-mini
- Respond to you directly
- Commit the conversation to Git

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
