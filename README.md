# 🤖 Agent0

**A simple AI agent that lives in GitHub Actions**

Agent0 is an autonomous AI agent that runs entirely on GitHub Actions, communicates via Telegram, remembers every conversation in Git, and can create pull requests for code changes.

## 🌟 Features

- **🧠 Persistent Memory**: Every conversation stored in Git history
- **⏰ Asynchronous**: Responds every 5 minutes via GitHub Actions cron
- **💬 Telegram Bot**: Simple text-based interface with natural language
- **📝 Self-Aware**: Reads its own `soul.md` and understands its purpose
- **🚀 Serverless**: No servers to maintain, runs on GitHub Actions
- **🎯 Natural Language**: No bot commands - just chat naturally
- **🔧 PR Creation**: Can create GitHub issues assigned to Copilot agent for automated code changes

## 🏗️ Architecture

```
User → Telegram → GitHub Actions (every 5 min) → Agent0 → Response
                          ↓
                     Git commits (memory)
```

## 📁 Structure

```
agent0/
├── .github/workflows/
│   └── agent.yml           # Main workflow (every 5 min)
├── agents/primary/
│   ├── soul.md             # Personality and purpose
│   └── identity.json       # Metadata
├── memory/                  # Persistent memory
│   ├── conversations/      # All conversations (by month/user)
│   ├── sessions/          # Active session contexts
│   └── embeddings/        # Vector embeddings for semantic search
├── queue/
│   └── last_id.json       # Last processed message ID
└── src/
    ├── bot.js             # Main bot logic
    ├── github-service.js  # GitHub API integration
    └── memory-engine.js   # Memory management
```

## 🚀 Setup

### 1. Create Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Use `/newbot` command
3. Get your bot token

### 2. Add Secrets to GitHub

Go to your repository → Settings → Secrets and variables → Actions

Add these secrets:

- `TELEGRAM_BOT_TOKEN` - Your bot token from BotFather
- `OPENAI_API_KEY` - Your OpenAI API key from [platform.openai.com](https://platform.openai.com)

### 3. Enable GitHub Actions

1. Go to the "Actions" tab in your repository
2. Enable workflows if prompted
3. The bot will start running automatically every 5 minutes

### 4. Test Your Bot

Send a message to your Telegram bot. Within 5 minutes (at the next cron run), the agent will:
1. Poll for your message
2. Load its soul and memory
3. Think and generate a response using GPT-4o-mini
4. Reply to you
5. Commit the conversation to Git

## 💬 Usage

Just message your bot on Telegram with natural language! Examples:

```
"Hello!"
"What can you do?"
"Can you create a PR to add a new feature?"
"Remember that I prefer Python over JavaScript"
```

The agent will:
- Remember all your conversations
- Maintain context across sessions
- Use its personality defined in `soul.md`
- Create GitHub issues and assign them to Copilot agent for code changes

## 🤖 How It Works

1. **Every 5 minutes**, GitHub Actions triggers the workflow
2. The bot checks Telegram for new messages
3. For each message:
   - Loads the user's conversation history and session context
   - Loads its soul/personality from `agents/primary/soul.md`
   - Processes the message with GPT-4o-mini
   - Can create GitHub issues assigned to Copilot agent if requested
   - Sends response back via Telegram
   - Saves conversation to Git

## 🧠 Memory System

- **Long-term memory**: All conversations stored in `memory/conversations/`
- **Session memory**: Recent context in `memory/sessions/`
- **Embeddings**: Semantic search using `memory/embeddings/`
- **Git-based**: Everything is version controlled

## 🎯 Key Features

### Chat with Memory
The agent remembers all your previous conversations and maintains context within sessions.

### Natural Language Code Changes with Copilot Agent
Ask the agent to make code changes, and it will create a GitHub issue assigned to the Copilot agent. The Copilot agent will then automatically implement the changes and create a pull request:

```
You: "Can you add a new API endpoint for user authentication?"
Agent: "✅ I've created a GitHub issue and assigned it to Copilot agent!
        🔗 Issue Link: https://github.com/...
        🤖 The GitHub Copilot agent will process this issue and create a PR automatically."
```

### Soul & Personality
The agent's personality is defined in `agents/primary/soul.md`. It knows who it is, what it can do, and maintains a consistent identity across all interactions.

## 📝 Configuration

Edit `agents/primary/soul.md` to customize the agent's personality and purpose.

Edit `agents/primary/identity.json` to update metadata and statistics.

## 🔒 Privacy

- All conversations are stored in your Git repository
- No external databases
- Full control over your data

## 📊 What's Simplified

This is a streamlined version of Agent0 that focuses on:
- ✅ Chat with memory and personality
- ✅ Processing messages with GPT-4o-mini
- ✅ Creating GitHub issues assigned to Copilot agent for code changes
- ❌ No complex task queues
- ❌ No sandbox execution
- ❌ No web search
- ❌ No skill management system
- ❌ No hot reload or scheduling
- ❌ Simple single workflow

## 📄 License

MIT

---

Made with ❤️ by [motyar](https://github.com/motyar)
