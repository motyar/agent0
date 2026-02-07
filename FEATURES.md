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

### Natural Language Management

Manage skills through natural conversation with the agent:

**Installing Skills:**
```
You: Install the vercel/code-review skill
Agent0: I've successfully installed the vercel/code-review skill! 
        It's now available and loaded into my context.
```

**Listing Skills:**
```
You: What skills do you have?
Agent0: I currently have 2 skills installed:
        • code-review.md (managed)
        • example-skill.md (workspace)
```

**Removing Skills:**
```
You: Remove the code-review.md skill
Agent0: I've successfully removed the code-review.md skill!
```

### How Skills Work

1. **Storage**: Skills.sh skills (SKILL.md files) are stored in `skills/managed/` and `skills/workspace/` directories
2. **Loading**: When the agent initializes, skills are loaded and parsed
3. **Injection**: Skill instructions are injected into the agent's system prompt
4. **Usage**: The agent uses skill instructions to enhance its responses
5. **Management**: Skills can be dynamically added/removed through natural language conversation

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

Create pull requests directly through natural language conversation with the agent.

### How It Works

1. **Send a Task Request**: Ask the agent to create a PR in natural language
2. **PR Creation**: Bot automatically creates a branch and pull request
3. **Copilot Execution**: GitHub Copilot agents execute the task

### Usage

**Natural Language Examples**:
```
You: Create a PR to add a health check endpoint
Agent0: ✅ I've created PR #123 for your task! 
        You can track progress at: [PR URL]
```

```
You: Make a PR to fix authentication bug in login flow
Agent0: ✅ I've created PR #124 successfully!
        The PR is ready for GitHub Copilot agents to work on.
```

```
You: Please create a pull request to improve error handling
Agent0: ✅ I've created PR #125 for you!
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
- `src/agent.js` - Handle PR creation via OpenAI tool calling

**Features**:
- Natural language understanding via OpenAI function calling
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
- ✅ Semantic Search (vector embeddings)
- ✅ Multi-agent Routing
- ✅ Hot Reload
- ✅ Docker Sandbox
- ✅ Streaming Responses
- ✅ Web Search Integration
- ✅ Advanced Tool Execution (TypeBox)

## Phase 3 Features (NEW)

### Semantic Memory Search

Advanced conversation search using OpenAI embeddings and cosine similarity.

**Features:**
- Automatic embedding generation for all conversations
- Vector similarity search with configurable threshold
- Fallback to keyword search if embeddings unavailable
- Persistent embedding storage alongside conversations

**Usage:**
```javascript
// Search semantically similar conversations
const results = await memory.semanticSearch(userId, 'explain docker containers', {
  limit: 5,
  minSimilarity: 0.7
});

// Results include similarity scores
results.forEach(result => {
  console.log(`Similarity: ${result.similarity}`);
  console.log(`User: ${result.user}`);
  console.log(`Bot: ${result.bot}`);
});
```

**Configuration:**
- Uses `text-embedding-3-small` model by default
- Embeddings stored in `memory/embeddings/` directory
- Requires `OPENAI_API_KEY` environment variable

### Multi-agent Collaboration

Route messages to different specialized agents based on configuration.

**Features:**
- Parse AGENTS.md for agent configuration
- Channel-based routing
- Capability-based routing
- Task-type routing
- Agent hand-offs with context preservation

**Configuration in AGENTS.md:**
```json
{
  "routing": {
    "enabled": true,
    "strategy": "channel-based",
    "agents": {
      "primary": {
        "channels": ["*"],
        "model": "gpt-4o-mini",
        "capabilities": ["conversation", "memory", "learning"]
      },
      "support": {
        "channels": ["support"],
        "model": "gpt-4o-mini",
        "capabilities": ["conversation", "help"]
      }
    }
  }
}
```

**Usage:**
```javascript
// Route message to appropriate agent
const agentId = router.route(message, { channel: 'support' });

// Hand off to another agent
const handoff = router.handoff('primary', 'support', 'User needs technical help');
```

### Docker-based Sandbox Mode

Execute untrusted code safely in isolated Docker containers.

**Features:**
- Support for JavaScript, Python, and Bash
- Network isolation (no network access)
- Resource limits (CPU, memory)
- Read-only file system
- Automatic timeout and cleanup
- Code validation before execution

**Usage:**
```javascript
const sandbox = new Sandbox();

// Execute code
const result = await sandbox.executeCode(`
  console.log('Hello from sandbox!');
  console.log(2 + 2);
`, 'javascript');

console.log(result.output); // Output from code
console.log(result.executionTime); // Execution time in ms
```

**Requirements:**
- Docker must be installed and running
- Default images: `node:22-alpine`, `python:3.12-alpine`, `alpine:latest`

**Security:**
- No network access
- Limited memory (128MB default)
- CPU limits (0.5 CPUs default)
- 30-second timeout default
- Read-only filesystem with small writable /tmp

### Hot Reload for Code Changes

Automatically reload components when source code changes.

**Features:**
- Watch `src/` directory for changes
- Debounced reload (1 second delay)
- Component-specific reload strategies
- Graceful handling of errors
- Exclude node_modules and test files

**Usage:**
```javascript
const agent = new Agent0({ enableHotReload: true });
await agent.initialize();
// Now any changes to src/ files will trigger automatic reload
```

**Supported Components:**
- Memory engine
- Telegram service
- Scheduler
- Skills system
- Agent router
- Sandbox

### Streaming Responses

Real-time response updates in Telegram as the LLM generates text.

**Features:**
- Stream OpenAI completions
- Update Telegram messages in real-time
- Configurable update interval (500ms default)
- Graceful fallback on errors

**Implementation:**
```javascript
// Telegram service now supports streaming
const streamIterator = getStreamFromOpenAI();
await telegram.sendStreamingMessage(chatId, streamIterator, {
  updateInterval: 500
});
```

**Benefits:**
- Better user experience with immediate feedback
- Reduces perceived latency
- Shows "thinking" progress

### Web Search Integration

Search the web using DuckDuckGo or Bing APIs.

**Features:**
- DuckDuckGo Instant Answer API (free, no key required)
- Bing Search API (requires API key)
- Configurable result count
- Formatted results with snippets
- Automatic provider selection

**Usage:**
```javascript
const webSearch = new WebSearch();

// Search using DuckDuckGo (default)
const results = await webSearch.search('OpenAI GPT-4', { maxResults: 5 });

// Format results for display
const formatted = webSearch.formatResults(results);
console.log(formatted);
```

**Tool Integration:**
```javascript
// Available as agent tool
{
  name: 'web_search',
  description: 'Search the web for information',
  parameters: {
    query: { type: 'string' },
    maxResults: { type: 'number', default: 5 }
  }
}
```

### Advanced Tool Execution with TypeBox

Schema validation and better type safety for tool parameters.

**Features:**
- TypeBox schema definitions
- Runtime parameter validation
- Better LLM understanding
- Type inference
- Pattern matching and constraints

**Example Schema:**
```javascript
import { Type } from '@sinclair/typebox';

const schema = Type.Object({
  code: Type.String({
    description: 'Code to execute',
    maxLength: 50000
  }),
  language: Type.Union([
    Type.Literal('javascript'),
    Type.Literal('python'),
    Type.Literal('bash')
  ], {
    default: 'javascript'
  })
});
```

**Benefits:**
- Compile-time type checking
- Runtime validation
- Better error messages
- Improved LLM tool calling accuracy

## Support

For questions or issues:
1. Check [skills/README.md](skills/README.md) for skills documentation
2. Review `config/models.json` for LLM configuration
3. Open an issue on GitHub
