# Agent0 Features Documentation

## Table of Contents
- [Core Architecture](#core-architecture)
- [Skills Engine](#skills-engine)
- [Multi-Provider LLM](#multi-provider-llm)
- [PR Creation via Bot](#pr-creation-via-bot)
- [Memory System](#memory-system)
- [Automation & Scheduling](#automation--scheduling)
- [Developer Features](#developer-features)

## Core Architecture

Agent0 has been architected for simplicity and extensibility.

## Skills Engine

Auto-discovery system for modular capabilities. Skills are automatically discovered from three locations:

- `skills/bundled/` - Built-in skills
- `skills/managed/` - Installed skills  
- `skills/workspace/` - Custom skills

### Built-in Skills

**core** - Essential system operations
- Actions: ping, status, echo, help

**github** - GitHub API integrations
- Actions: status, create_issue, create_pr, help

**help** - Documentation and assistance
- Topics: skills, commands, setup

See [skills/README.md](skills/README.md) for detailed documentation.

## Skills.sh System Integration

Agent0 now supports Skills.sh integration for modular, reusable agent capabilities through SKILL.md files.

### What are Skills.sh Skills?

Skills.sh is an open directory for AI agent skills - packaged instructions, best practices, and automation that extend agent capabilities. Skills are typically stored as SKILL.md files and can be installed from the Skills.sh directory at https://skills.sh.

### Available Commands

Manage skills through Telegram bot commands:

- `/skill_add owner/repo` - Install a skill from Skills.sh
- `/skill_list` - List all installed Skills.sh skills  
- `/skill_remove skill-name.md` - Remove a skill
- `/skills_help` - Show skills help

**Examples:**
```
/skill_add vercel/code-review
/skill_list
/skill_remove code-review.md
```

### How Skills Work

1. **Storage**: Skills.sh skills (SKILL.md files) are stored in `skills/managed/` and `skills/workspace/` directories
2. **Loading**: When the agent initializes, skills are loaded and parsed
3. **Injection**: Skill instructions are injected into the agent's system prompt
4. **Usage**: The agent uses skill instructions to enhance its responses
5. **Management**: Skills can be dynamically added/removed through Telegram commands

### Skill Directories

- `skills/bundled/` - Built-in JavaScript skills (core, github, help)
- `skills/managed/` - Skills.sh SKILL.md files installed from external sources
- `skills/workspace/` - Custom SKILL.md files specific to your workspace

### Example Skills from Skills.sh

- Code review best practices
- Deployment automation
- API integration patterns
- Communication templates
- Documentation generation
- And thousands more at https://skills.sh

### For Developers

```javascript
import SkillManager from './src/skillManager.js';

const skillManager = new SkillManager();

// Ensure directories exist
await skillManager.ensureDirectories();

// Load all SKILL.md files
const skills = await skillManager.loadSkills();

// Install new skill from Skills.sh
await skillManager.installSkill('owner/repo');

// Get skills context for agent prompts
const context = await skillManager.getSkillsContext();

// List installed skills
const list = await skillManager.listSkills();

// Remove a skill
await skillManager.removeSkill('skill-name.md');
```

### Configuration

Skills.sh integration is configured in `agents/agent0/config.json`:

```json
{
  "skills": {
    "enabled": true,
    "directory": "./skills",
    "autoload": true,
    "sources": ["skills.sh"]
  }
}
```

## Multi-Provider LLM

Abstraction layer supporting multiple AI providers with a unified interface.

### Supported Providers

**OpenAI:**
- gpt-4o-mini (default, fast and affordable)
- gpt-4o (high performance)
- gpt-4 (legacy)
- gpt-3.5-turbo (legacy)

**Anthropic:**
- claude-3-5-sonnet-20241022 (most intelligent)
- claude-3-5-haiku-20241022 (fast and affordable)
- claude-3-opus-20240229 (legacy)

### Configuration

Models are configured in `config/models.json`:

```json
{
  "default_provider": "openai",
  "default_model": "gpt-4o-mini",
  "providers": {
    "openai": {
      "enabled": true,
      "models": { ... }
    },
    "anthropic": {
      "enabled": true,
      "models": { ... }
    }
  }
}
```

### Usage

```javascript
import LLM from './src/llm.js';

const llm = new LLM();
await llm.initialize();

// Use default provider/model
const result = await llm.complete({
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

// Specify provider and model
const result = await llm.complete({
  messages: [...],
  provider: 'anthropic',
  model: 'claude-3-5-haiku-20241022'
});

console.log(result.content);
console.log(`Cost: $${result.cost.toFixed(4)}`);
```

## PR Creation via Bot

Create pull requests directly from Telegram bot messages for execution by GitHub Copilot agents.

### How It Works

1. **Send a Task Request**: Message the bot with your task
2. **PR Creation**: Bot automatically creates a branch and pull request
3. **Copilot Execution**: GitHub Copilot agents execute the task

### Usage

**Supported Commands**:
- `create a PR to [task]`
- `make a PR to [task]`
- `create a pull request to [task]`
- `can you create a PR to [task]`
- `please create a PR to [task]`

**Examples**:
```
You: create a PR to add a health check endpoint
Bot: ✅ PR Created Successfully!
     PR: #123
     Branch: bot-task/add-a-health-check-endpoint-1234567890
```

```
You: make a PR to fix authentication bug in login flow
Bot: ✅ PR Created Successfully!
     PR: #124
     Branch: bot-task/fix-authentication-bug-in-login-flow-1234567891
```

### Requirements

- `GITHUB_TOKEN` must be set in environment variables
- Workflow must have `pull-requests: write` permission
- Task description must be at least 10 characters

### PR Format

Created PRs include:
- **Title**: `Bot Task: [task description]`
- **Body**: Detailed instructions for Copilot agents
- **Labels**: `bot-task`, `copilot`
- **Branch**: `bot-task/[sanitized-task]-[timestamp]`

### Configuration

The feature requires these environment variables in GitHub Actions:
```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  GITHUB_REPOSITORY: ${{ github.repository }}
```

And these permissions:
```yaml
permissions:
  contents: write
  pull-requests: write
```

### Implementation

**Core Files**:
- `src/github-service.js` - GitHub API integration
- `src/task-parser.js` - Parse task requests from messages
- `src/agent.js` - Handle PR creation in message processing

**Features**:
- Automatic branch creation from main
- Sanitized branch names
- Detailed PR descriptions for Copilot
- Error handling and user feedback
- Validation of task descriptions

## Memory System

Git-based conversation persistence with enhanced search and summarization.

### Features

**Persistent Storage:**
- One file per user per month
- Automatic directory organization
- Git-based versioning
- Up to 100 turns per user

**Enhanced Search:**
- Keyword matching with relevance scoring
- Multi-word query support
- Configurable result limits

**Summarization:**
- Topic extraction from conversations
- Sentiment analysis (positive/negative/neutral)
- Time-based filtering
- Conversation statistics

### Usage

```javascript
import MemoryEngine from './src/memory-engine.js';

const memory = new MemoryEngine();

// Store conversation
await memory.remember(userId, userMessage, botResponse);

// Recall history
const history = await memory.recall(userId, limit=10);

// Search memories
const results = await memory.search(userId, 'query', {
  limit: 50,
  minScore: 0.3
});

// Summarize conversations
const summary = await memory.summarize(userId, { limit: 100 });
console.log(summary.topics);
console.log(summary.sentiment);
```

## Automation & Scheduling

### Cron Jobs
Scheduled task execution using standard cron syntax.

**Configuration**: `config/scheduler.json`

**Example**:
```json
{
  "cron_jobs": [
    {
      "id": "self_analysis",
      "schedule": "0 0 * * *",
      "enabled": true,
      "task": {
        "type": "self_analysis",
        "params": {
          "depth": "full"
        }
      }
    }
  ]
}
```

**Built-in Task Types**:
- `self_analysis` - Analyze agent performance and identify improvements
- `memory_cleanup` - Clean up old conversation history
- `health_check` - Run system health diagnostics
- `custom` - Execute custom task handlers

### Wakeup Tasks
Time-based triggers that execute once at a specific time.

**Example**:
```json
{
  "wakeup_tasks": [
    {
      "id": "morning_wakeup",
      "trigger_time": "2026-02-08T06:00:00.000Z",
      "enabled": true,
      "task": {
        "type": "custom",
        "handler": "morning_routine"
      }
    }
  ]
}
```

**Usage**:
- Schedule one-time events
- Set reminders
- Trigger maintenance tasks at specific times

### Webhook Support

Real-time event processing via GitHub repository dispatch.

**Workflow:** `.github/workflows/webhook.yml`

**Trigger Events:**
- telegram-message - Process messages in real-time
- health-check - Run diagnostics
- custom - Handle custom events

**Example Trigger:**
```bash
curl -X POST \
  https://api.github.com/repos/OWNER/REPO/dispatches \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{"event_type": "telegram-message"}'
```

## Developer Features

### Available Commands

```bash
npm run start         # Start agent
npm run poll          # Poll Telegram
```

## Migration Guide

The codebase has been simplified to focus on core functionality.

**Skills Management**
```javascript
// Use SkillsManager and SkillManager for skills
import SkillsManager from './skills-manager.js';
import SkillManager from './skillManager.js';
const skills = new SkillsManager();
const skillManager = new SkillManager('./skills');
```

**LLM Integration**
```javascript
// Use multi-provider LLM abstraction
import LLM from './llm.js';
const llm = new LLM();
await llm.initialize();
const result = await llm.complete({ messages });
```

## Feature Status

- ✅ **Production Ready** - Fully tested and documented
- 🚧 **Beta** - Functional but may change
- ⏳ **Planned** - In roadmap

### Current Status

- ✅ Skills Engine (auto-discovery)
- ✅ Multi-Provider LLM
- ✅ Enhanced Memory Search
- ✅ Webhook Support
- ✅ PR Creation via Bot
- 🚧 Semantic Search (basic implementation)
- ⏳ Hot Reload
- ⏳ Docker Sandbox
- ⏳ Streaming Responses

## Support

For questions or issues:
1. Run `npm run doctor` to diagnose
2. Check [skills/README.md](skills/README.md) for skills documentation
3. Review `config/models.json` for LLM configuration
4. Open an issue on GitHub
