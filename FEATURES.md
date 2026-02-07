# Agent0 Features Documentation

## Table of Contents
- [Automation & Scheduling](#automation--scheduling)
- [Skills & Extensions](#skills--extensions)
- [Sandbox Mode](#sandbox-mode)
- [Developer Features](#developer-features)
- [Additional Features](#additional-features)

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

## Skills & Extensions

### Skills Platform
Manage and execute modular skills for extended functionality.

**Skill Types**:
1. **Bundled Skills** - Built-in skills shipped with Agent0
2. **Managed Skills** - Installed skills from external sources
3. **Workspace Skills** - Custom skills specific to your workspace

**Directory Structure**:
```
skills/
├── bundled/       # Built-in skills
├── managed/       # Installed skills
└── workspace/     # Custom skills
```

**Creating a Skill**:
```javascript
// skills/workspace/my-skill.js
const mySkill = {
  name: 'my_skill',
  version: '1.0.0',
  description: 'My custom skill',
  
  async execute(params) {
    // Your skill logic here
    return { success: true };
  }
};

export default mySkill;
```

**Using Skills**:
```javascript
import SkillsManager from './src/skills-manager.js';

const skills = new SkillsManager();
await skills.initialize();

// Execute a skill
const result = await skills.executeSkill('my_skill', { param: 'value' });

// List all skills
const allSkills = skills.listSkills();
```

### Custom Workspace Configuration

Configure agent behavior using workspace files:

#### AGENTS.md
Configure multi-agent routing and agent-specific settings.

**Features**:
- Define multiple agent instances
- Configure routing strategies
- Set agent capabilities

#### TOOLS.md
Define available tools and integrations.

**Features**:
- Document tool capabilities
- Configure tool permissions
- Set retry policies and streaming options

## Sandbox Mode

Docker-based isolation for non-main sessions (Planned).

**Purpose**:
- Isolate code execution
- Protect main system from potentially harmful operations
- Test new skills safely

**Status**: 🚧 Coming in Phase 3

## Developer Features

### Hot Reload
Auto-reload on TypeScript changes (Planned).

**Status**: 🚧 Coming in Phase 3

### Debug Tools
Built-in debugging capabilities.

**Features**:
- Comprehensive error logging
- Stack traces
- Performance monitoring

### Health Checks
Gateway health monitoring system.

**Usage**:
```javascript
import HealthCheck from './src/health-check.js';

const health = new HealthCheck();

// Register a health check
health.register('api', async () => {
  // Check if API is responding
  return { status: 'ok' };
}, { interval: 60000 });

// Run all checks
const results = await health.runAll();
```

**Built-in Checks**:
- System health
- API connectivity
- Memory usage
- Configuration validity

**Schedule**: Runs every 15 minutes via cron

### Doctor Command
Diagnose and fix configuration issues.

**Usage**:
```bash
# Run diagnostics
npm run doctor

# Attempt automatic fixes
npm run fix
```

**Checks**:
- ✅ Node.js version
- ✅ Package dependencies
- ✅ Environment variables
- ✅ Directory structure
- ✅ Agent configuration
- ✅ Workflow files

### Logging System
Comprehensive logging with multiple levels.

**Log Levels**:
- `error` - Critical errors
- `warn` - Warnings
- `info` - General information (default)
- `debug` - Debug information
- `trace` - Detailed trace information

**Usage**:
```javascript
import Logger from './src/logger.js';

const logger = new Logger({ level: 'debug' });

logger.error('Critical error occurred');
logger.warn('Warning message');
logger.info('Information');
logger.debug('Debug details');
logger.trace('Trace information');
```

**Features**:
- Colored output
- Timestamps
- Configurable levels
- Consistent formatting

### TypeBox Schemas
Type-safe configuration (Planned).

**Status**: 🚧 Coming in Phase 3

## Additional Features

### Multi-Agent Routing
Route channels to isolated agents (Planned).

**Purpose**:
- Handle multiple conversations independently
- Isolate different use cases
- Scale horizontally

**Status**: 🚧 Coming in Phase 3

### Presence Indicators
Show online/typing status (Planned).

**Status**: 🚧 Coming in Phase 3

### Usage Tracking
Monitor API usage and costs.

**Tracks**:
- Total API requests
- Token consumption
- Costs by model
- Usage by date

**Usage**:
```javascript
import UsageTracker from './src/usage-tracker.js';

const tracker = new UsageTracker();

// Track an API call
tracker.track('gpt-4o-mini', 150, 0.0002);

// Get summary
const summary = tracker.getSummary();
console.log(`Total cost: $${summary.total.cost.toFixed(4)}`);
```

### Streaming/Chunking
Real-time response delivery (Planned).

**Purpose**:
- Stream responses as they're generated
- Reduce perceived latency
- Improve user experience

**Status**: 🚧 Coming in Phase 3

### Retry Policy
Automatic retry on failures with exponential backoff.

**Configuration**:
```javascript
import RetryPolicy from './src/retry-policy.js';

const retry = new RetryPolicy({
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
});

// Execute with retry
const result = await retry.execute(async () => {
  // Your API call or operation
  return await someAPICall();
}, 'API call');
```

**Features**:
- Configurable attempts
- Exponential backoff
- Maximum delay cap
- Context logging

### Session Pruning
Automatic context management.

**Purpose**:
- Prevent context overflow
- Manage token limits
- Optimize performance

**Features**:
- Automatic pruning when threshold reached
- Keeps system messages
- Removes oldest non-critical messages
- Tracks session statistics

**Usage**:
```javascript
import SessionManager from './src/session-manager.js';

const sessions = new SessionManager({
  maxContextLength: 10000,
  pruneThreshold: 0.8,
  prunePercent: 0.3
});

// Add message to session
sessions.addMessage('session-123', {
  role: 'user',
  content: 'Hello!'
}, 50);

// Session automatically prunes when needed
```

**Statistics**:
- Track total sessions
- Monitor message counts
- View token usage per session
- Automatic cleanup of old sessions

---

## Feature Status Legend

- ✅ **Implemented** - Feature is complete and working
- 🚧 **Planned** - Feature is planned for future releases
- ⏳ **In Progress** - Feature is currently being developed

## Support

For questions or issues with any of these features, please:
1. Run `npm run doctor` to diagnose issues
2. Check the documentation in this file
3. Open an issue on GitHub
