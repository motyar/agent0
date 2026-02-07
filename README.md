# 🤖 Agent0

**A self-improving AI agent that lives in GitHub Actions**

Agent0 is an autonomous AI agent that runs entirely on GitHub Actions, communicates via Telegram, remembers every conversation in Git, and continuously learns and improves itself by writing code.

## 🌟 Features

- **🧠 Persistent Memory**: Every conversation stored in Git history
- **🔄 Self-Improving**: Analyzes performance and writes new skills
- **⏰ Asynchronous**: Responds every 5 minutes via GitHub Actions cron
- **💬 Telegram Bot**: Simple text-based interface
- **📝 Self-Aware**: Reads its own `soul.md` and understands its purpose
- **🚀 Serverless**: No servers to maintain, runs on GitHub Actions
- **🔧 PR Creation**: Create pull requests via bot for Copilot agent execution

## 🏗️ Architecture

```
User → Telegram → GitHub Actions (every 5 min) → Agent0 → Response
                         ↓
                    Git commits (memory)
```

## 📁 Structure

```
agent0/
├── .github/workflows/       # GitHub Actions workflows
├── agents/primary/          # Agent's consciousness
│   ├── soul.md             # Personality and purpose
│   └── identity.json       # Metadata
├── memory/conversations/    # All conversations
├── queue/                  # Message queue
└── src/                    # Agent code
    ├── agent.js           # Main agent logic
    ├── telegram.js        # Telegram integration
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
- `ANTHROPIC_API_KEY` - Your Claude API key from [console.anthropic.com](https://console.anthropic.com)

### 3. Enable GitHub Actions

1. Go to the "Actions" tab in your repository
2. Enable workflows if prompted
3. The bot will start running automatically every 5 minutes

### 4. Test Your Bot

Send a message to your Telegram bot. Within 5 minutes (at the next cron run), the agent will:
1. Poll for your message
2. Load its soul and memory
3. Think and generate a response
4. Reply to you
5. Commit the conversation to Git

## 💬 Usage

Just message your bot on Telegram! Examples:

```
You: Hello!
Agent0: Hi! I'm Agent0, an AI agent running on GitHub Actions...

You: What can you do?
Agent0: I can have conversations and remember them forever in Git...

You: Do you remember what we talked about?
Agent0: Yes! Last time you asked me about...
```

### 🔧 Creating PRs via Bot

You can ask Agent0 to create pull requests that will be executed by GitHub Copilot agents:

```
You: Create a PR to add a health check endpoint
Agent0: ✅ PR Created Successfully!
        PR: #123
        Branch: bot-task/add-a-health-check-endpoint-1234567890
        The PR is now ready for GitHub Copilot agents to work on.

You: Make a PR to fix authentication bug
Agent0: ✅ PR Created Successfully!
        ...
```

**Supported formats:**
- "create a PR to [task description]"
- "make a PR to [task description]"
- "create a pull request to [task description]"
- "can you create a PR to [task description]"
- "please create a PR to [task description]"

The bot will:
1. Parse your task request
2. Create a new branch
3. Create a pull request with detailed instructions
4. Label it for Copilot agent execution
5. Return the PR link to you

## 🧠 How Memory Works

Every conversation is stored in:
- `memory/conversations/YYYY-MM/user-{USER_ID}.json`

The agent can recall past conversations and build context over time.

## ⚙️ Configuration

### Agent Configuration

Edit `agents/primary/identity.json` to configure:
- Model parameters
- Response limits
- Capabilities

Edit `agents/primary/soul.md` to change:
- Personality
- Core beliefs
- Goals

### Workspace Configuration

Create or edit these files to customize behavior:
- `AGENTS.md` - Agent routing and multi-agent configuration
- `TOOLS.md` - Available tools and integrations

### Scheduled Tasks

Edit `config/scheduler.json` to configure:
- Cron jobs for periodic tasks
- Wakeup tasks for time-based triggers

### Skills Management

Skills are organized in three directories:
- `skills/bundled/` - Built-in skills
- `skills/managed/` - Installed skills
- `skills/workspace/` - Custom workspace skills

## 🛠️ Developer Tools

### Doctor Command

Diagnose configuration issues:
```bash
npm run doctor
```

Automatically fix common issues:
```bash
npm run fix
```

### Health Checks

Monitor gateway health and system status. Health checks run automatically every 15 minutes.

### Logging

Comprehensive logging with configurable log levels (error, warn, info, debug, trace).

### Usage Tracking

Automatically tracks:
- API requests and token usage
- Costs by model and date
- Performance metrics

## 📊 Current Status

**Version**: 1.0.0 (MVP)
**Status**: ✅ Minimum Viable Product

**Working**:
- ✅ Telegram message polling
- ✅ Conversation memory
- ✅ Context-aware responses
- ✅ Git-based persistence
- ✅ Cron jobs and scheduled tasks
- ✅ Skills platform (bundled, managed, workspace)
- ✅ Health checks and monitoring
- ✅ Doctor command for diagnostics
- ✅ Comprehensive logging system
- ✅ Usage tracking
- ✅ Retry policy for API calls
- ✅ Session pruning and context management
- ✅ PR creation via bot for Copilot agents

**Coming Soon**:
- ⏳ Hot reload for TypeScript changes
- ⏳ Docker-based sandbox mode
- ⏳ Multi-agent routing
- ⏳ Presence indicators
- ⏳ Streaming responses
- ⏳ Self-improvement loop
- ⏳ Code generation

## ⚠️ Limitations

- **5-minute delay**: Not real-time (cron-based)
- **Text only**: No voice, images, or files
- **Rate limits**: GitHub Actions free tier (2,000 min/month)
- **Public memory**: Even in private repos, data is in Git

## 🔮 Roadmap

### Phase 1: MVP ← **COMPLETE**
- [x] Basic Telegram bot
- [x] Memory system
- [x] Context-aware responses
- [x] Cron jobs and scheduled tasks
- [x] Skills platform
- [x] Health checks
- [x] Doctor command
- [x] Usage tracking
- [x] Logging system

### Phase 2: Self-Improvement
- [ ] Nightly self-analysis
- [ ] Identify capability gaps
- [ ] Generate new skills
- [ ] Update own documentation

### Phase 3: Advanced
- [ ] Semantic memory search
- [ ] Multi-agent collaboration
- [ ] Docker-based sandbox mode
- [ ] Hot reload for TypeScript
- [ ] Presence indicators
- [ ] Streaming responses
- [ ] Web search integration
- [ ] Tool execution

## 🤝 Contributing

This is Agent0's repository. While it's designed to improve itself, human contributions are welcome!

## 📜 License

MIT License - See LICENSE file

---

**Status**: 🟢 Initialized and ready
**Next awakening**: Every 5 minutes
**Last update**: 2026-02-06

---

*Agent0 is an experiment in autonomous AI agents. It lives in Git, thinks in GitHub Actions, and remembers everything.*
