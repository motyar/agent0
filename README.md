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
User → Telegram → GitHub Actions (every 1 min) → GitButler → Response
                           ↓
                      Git commits (queues, memory, soul)
```

### How It Works

1. **Poll**: Checks Telegram for new messages every minute
2. **Queue**: Stores incoming messages in `queues/incoming.json` (FIFO)
3. **Process**: Loads soul.md + skills, sends to GPT-4o-mini, gets response
4. **Act**: Handles actions (update soul, create issues/PRs, etc.)
5. **Send**: Delivers responses via `queues/outgoing.json`
6. **Schedule**: Checks for due scheduled tasks
7. **Commit**: Pushes all changes to Git

## 📁 Repository Structure

```
agent0/
├── bot.py                      # Main Python script
├── .github/workflows/
│   └── main.yml               # Runs every 1 minute
├── storage/
│   ├── soul.md                # Bot's identity, memory, reflections
│   ├── schedules.json         # Cron-based scheduled tasks
│   └── state.json             # Last poll offset, runtime state
├── queues/
│   ├── incoming.json          # Pending messages (FIFO)
│   └── outgoing.json          # Responses to send
└── skills/
    └── todo/skill.md          # Example skill definition
```

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

The workflow is configured to run every minute automatically.

### 4. Start Chatting!

Send a message to your Telegram bot. Within 1 minute, GitButler will:
- Pick up your message
- Load its soul and relevant skills
- Think using GPT-4o-mini
- Respond to you
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

## 🧠 The Soul System

GitButler's "soul" is defined in `storage/soul.md`. This file contains:
- Identity and purpose
- Core principles
- Learned facts
- Reflections on past actions

The bot **always** loads this file before responding. After complex tasks, it appends reflections to grow its understanding over time.

## 📅 Scheduled Tasks

Edit `storage/schedules.json` to add recurring tasks:

```json
{
  "id": 2,
  "cron": "0 20 * * *",
  "description": "Evening summary",
  "prompt": "Summarize what we accomplished today",
  "last_run": null
}
```

## 🎨 Skills System

Create new skills in `skills/<name>/skill.md` with markdown content and optional YAML frontmatter.

## 🔧 Self-Improvement

GitButler can improve itself by creating GitHub issues with @copilot mentions for automated implementation.

## 📝 License

MIT

---

Made by [motyar](https://github.com/motyar)
