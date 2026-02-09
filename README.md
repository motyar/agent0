# 🤖 Agent0

**A self-improving AI agent that lives in GitHub Actions**

Agent0 is an autonomous AI agent that runs entirely on GitHub Actions, communicates via Telegram, remembers every conversation in Git, and continuously learns and improves itself by writing code.

## 🌟 Features

- **🧠 Persistent Memory**: Every conversation stored in Git history
- **⏰ Asynchronous**: Responds every 5 minutes via GitHub Actions cron
- **💬 Telegram Bot**: Simple text-based interface with natural language
- **📝 Self-Aware**: Reads its own `soul.md` and understands its purpose
- **🚀 Serverless**: No servers to maintain, runs on GitHub Actions
- **🎯 Natural Language**: No bot commands - just chat naturally
- **🤖 Automated Code Changes**: Creates PRs with AI-generated code using Claude Sonnet 4.5
- **📬 Smart Notifications**: Real-time updates on PR status via Telegram

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
│   ├── agent.yml           # Main message processing (every 5 min)
│   └── webhook.yml         # Webhook handler for real-time events
├── agents/primary/          # Agent's consciousness
│   ├── soul.md             # Personality and purpose
│   └── identity.json       # Metadata and configuration
├── config/                  # Configuration files
│   ├── models.json         # LLM provider configuration
│   └── scheduler.json      # Scheduled tasks
├── memory/                  # Persistent memory
│   ├── conversations/      # All conversations (by month/user)
│   ├── sessions/          # Active session contexts
│   └── embeddings/        # Vector embeddings for semantic search
├── queue/                  # Message and task queues
│   ├── incoming.json      # Incoming Telegram messages
│   └── tasks/             # Async task queue system
│       ├── input.json     # Pending tasks
│       ├── output.json    # Task results
│       └── current.json   # Currently processing task
├── skills/                 # Modular skills
│   ├── bundled/           # Built-in skills
│   ├── managed/           # Installed skills
│   ├── workspace/         # Custom skills
│   └── README.md          # Skills documentation
└── src/                    # Agent code
    ├── agent.js           # Main agent logic
    ├── telegram.js        # Telegram integration
    ├── memory-engine.js   # Memory management with search
    ├── task-queue.js      # Async task queue manager
    ├── skills-engine.js   # Auto-discovery skills system
    └── llm.js             # Multi-provider LLM abstraction
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
- `ANTHROPIC_API_KEY` - Your Claude API key from [console.anthropic.com](https://console.anthropic.com) **(Required for automated code changes)**

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

Just message your bot on Telegram with natural language! Examples:

```
You: Hello!
Agent0: Hi! I'm Agent0, an AI agent running on GitHub Actions...

You: What can you do?
Agent0: I can have conversations, remember them forever in Git, and help you with various tasks. I work with Skills.sh to extend my capabilities...

You: Do you remember what we talked about?
Agent0: Yes! Last time you asked me about...

You: Can you help me improve the error handling in src/agent.js?
Agent0: ✅ I've created PR #123 for your code changes! The GitHub agent will process this using Claude Sonnet 4.5 and implement the improvements. You'll be notified when it's ready for review.
```

**Everything works with natural language - no bot commands needed!**

### 🤖 Automated Code Changes

Agent0 can automatically implement code changes for you:

```
You: Fix the authentication bug in login flow
Agent0: ✅ I've created PR #124 to fix the authentication bug!
        
        📝 Task: Fix authentication bug in login flow
        🔗 PR Link: https://github.com/motyar/agent0/pull/124
        
        ⚠️ Next Steps:
        1. Review the PR once the GitHub agent completes
        2. Test the changes if needed
        3. Approve and merge when ready

You: Add unit tests for the memory engine
Agent0: ✅ Created PR #125! The changes will be implemented by Claude Sonnet 4.5.
```

**Features:**
- 🎯 Natural language code requests
- 🤖 Claude Sonnet 4.5 powered implementation
- 📬 Telegram notifications for PR status
- ✅ Automatic code analysis and generation
- 🔄 Full workflow from request to merge

### 🎯 Skills System

Agent0 has a modular skills system that can be managed through natural language:

```
You: Install the vercel/code-review skill
Agent0: I've successfully installed the vercel/code-review skill! It's now available and loaded into my context.

You: What skills do you have installed?
Agent0: I currently have 3 skills installed: code-review.md, api-integration.md, and deploy.md

You: Remove the api-integration.md skill
Agent0: I've successfully removed the api-integration.md skill!
```

Skills are organized in three categories:
- **Bundled** - Built-in skills (core, github, help)
- **Managed** - Installed from external sources
- **Workspace** - Custom skills for your project

See [skills/README.md](skills/README.md) for details on creating skills.

## 🎯 Skills.sh Integration

Agent0 supports <a href="https://skills.sh">Skills.sh</a> for extending capabilities with community-driven skills.

### Pre-installed: find-skills

Agent0 comes with the **find-skills** skill from vercel-labs/skills pre-installed! This skill helps you discover and install additional skills from the ecosystem. Just ask:

```
You: How do I improve React performance?
Agent0: I found a skill that might help! The "vercel-react-best-practices" skill...

You: Find a skill for API testing
Agent0: Let me search for API testing skills...
```

### Natural Language Skill Management

Skills can be managed through natural conversation with the agent:

```
You: Install the vercel/code-review skill from Skills.sh
Agent0: I've successfully installed the vercel/code-review skill!

You: Show me what skills are installed
Agent0: I have 3 skills installed: find-skills (skills-cli), code-review.md (managed), 
        and example-skill.md (workspace)

You: Remove the code-review.md skill
Agent0: Successfully removed the code-review.md skill!
```

### What Can Skills Do?

Skills.sh skills are SKILL.md files containing instructions, best practices, and automation:

- 🔍 Enhanced code review
- 🚀 Deployment automation  
- 💬 Better conversation patterns
- 🛠️ Tool integration templates
- 📝 Documentation generation
- 🎨 Design patterns and best practices
- And much more!

Browse thousands of skills at <a href="https://skills.sh">skills.sh</a>

### How It Works

1. The **find-skills** skill is automatically installed via GitHub Actions workflow
2. Ask the agent to find or install skills using natural language (e.g., "find a skill for X")
3. Skills (SKILL.md files) are stored in `.agents/skills/`, `skills/managed/`, or `skills/workspace/`
4. Agent loads skills at startup and injects them into its context
5. Skills enhance the agent's knowledge and capabilities
6. Manage skills dynamically through natural conversation

## 🧠 How Memory Works

Agent0 now has two-tier memory system:

### Session Memory (Short-term)
- **Location**: `memory/sessions/user-{USER_ID}.json`
- **Purpose**: Maintains context for ongoing conversations
- **Capacity**: Last 20 messages per user
- **Lifespan**: 30 minutes of inactivity
- **Usage**: Automatically included in every conversation

### Long-term Memory
- **Location**: `memory/conversations/YYYY-MM/user-{USER_ID}.json`
- **Purpose**: Permanent storage of all conversations
- **Capacity**: Last 100 messages per user
- **Lifespan**: Forever (committed to Git)
- **Usage**: Searchable and retrievable when needed

The agent can recall past conversations and build context over time using both memory systems.

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

### Available Commands

```bash
npm run start         # Start the agent
npm run poll          # Poll for Telegram messages
```

## 📊 Current Status

**Version**: 1.0.2 (Simplified)
**Status**: ✅ Simplified with Natural Language

**Working**:
- ✅ Telegram message polling and replies
- ✅ Two-tier memory system (session + long-term)
- ✅ Natural language only - no bot commands
- ✅ Context-aware responses with session tracking
- ✅ Git-based persistence
- ✅ Multi-provider LLM support (OpenAI, Anthropic)
- ✅ Auto-discovery skills engine
- ✅ Personality and soul integration
- ✅ Async message processing (every 5 minutes)
- ✅ Automated code changes with Claude Sonnet 4.5
- ✅ PR creation and management via GitHub agent
- ✅ Real-time Telegram notifications for PR status

**New in v1.0.3**:
- 🚀 GitHub agent integration for automated code changes
- 🤖 Claude Sonnet 4.5 for intelligent code generation
- 📬 Smart PR notifications via Telegram
- ✨ Natural language code modification requests

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

### Phase 2: Enhanced Features ← **COMPLETE**
- [x] Multi-provider LLM support
- [x] Auto-discovery skills engine
- [x] Enhanced memory search
- [x] Webhook support

### Phase 3: Advanced ← **COMPLETE**
- [x] Semantic memory search (vector embeddings)
- [x] Multi-agent collaboration
- [x] Docker-based sandbox mode
- [x] Hot reload for code changes
- [x] Streaming responses
- [x] Web search integration
- [x] Advanced tool execution with TypeBox

### Phase 4: Future Enhancements
- [ ] Voice and multimedia support
- [ ] Custom model fine-tuning
- [ ] Advanced analytics dashboard
- [ ] Plugin marketplace

## 🤝 Contributing

This is Agent0's repository. While it's designed to improve itself, human contributions are welcome!

## 📜 License

MIT License - See LICENSE file

---

**Status**: 🟢 Active Development
**Next awakening**: Every 5 minutes
**Last update**: 2026-02-07

---

*Agent0 is an experiment in autonomous AI agents. It lives in Git, thinks in GitHub Actions, and remembers everything.*
