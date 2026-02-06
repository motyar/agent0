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

## 🧠 How Memory Works

Every conversation is stored in:
- `memory/conversations/YYYY-MM/user-{USER_ID}.json`

The agent can recall past conversations and build context over time.

## ⚙️ Configuration

Edit `agents/primary/identity.json` to configure:
- Model parameters
- Response limits
- Capabilities

Edit `agents/primary/soul.md` to change:
- Personality
- Core beliefs
- Goals

## 📊 Current Status

**Version**: 1.0.0 (MVP)
**Status**: ✅ Minimum Viable Product

**Working**:
- ✅ Telegram message polling
- ✅ Conversation memory
- ✅ Context-aware responses
- ✅ Git-based persistence

**Coming Soon**:
- ⏳ Self-improvement loop
- ⏳ Code generation
- ⏳ Custom skills

## ⚠️ Limitations

- **5-minute delay**: Not real-time (cron-based)
- **Text only**: No voice, images, or files
- **Rate limits**: GitHub Actions free tier (2,000 min/month)
- **Public memory**: Even in private repos, data is in Git

## 🔮 Roadmap

### Phase 1: MVP ← **YOU ARE HERE**
- [x] Basic Telegram bot
- [x] Memory system
- [x] Context-aware responses

### Phase 2: Self-Improvement
- [ ] Nightly self-analysis
- [ ] Identify capability gaps
- [ ] Generate new skills
- [ ] Update own documentation

### Phase 3: Advanced
- [ ] Semantic memory search
- [ ] Multi-agent collaboration
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
