# Integration Examples

This document provides examples of how to use the new features together.

## Example 1: Using the Skills Platform

```javascript
import Agent0 from './src/agent.js';

const agent = new Agent0();
await agent.initialize();

// List all available skills
const skills = agent.skills.listSkills();
console.log('Available skills:', skills);

// Execute a skill
const result = await agent.skills.executeSkill('conversation', {
  message: 'Hello!',
  context: 'Previous conversation...'
});
```

## Example 2: Monitoring Health and Usage

```javascript
import Agent0 from './src/agent.js';

const agent = new Agent0();
await agent.initialize();

// Run health checks
const health = await agent.healthCheck.runAll();
console.log('Health status:', health);

// Get usage statistics
const usage = agent.usageTracker.getSummary();
console.log('API Usage:', usage);

// Get comprehensive statistics
const stats = await agent.getStatistics();
console.log('Full statistics:', stats);
```

## Example 3: Session Management

```javascript
import SessionManager from './src/session-manager.js';

const sessions = new SessionManager({
  maxContextLength: 10000,
  pruneThreshold: 0.8
});

// Add messages to session
sessions.addMessage('user-123', {
  role: 'user',
  content: 'Hello, Agent0!'
}, 50);

sessions.addMessage('user-123', {
  role: 'assistant',
  content: 'Hello! How can I help you?'
}, 70);

// Get context
const context = sessions.getContext('user-123');

// Sessions auto-prune when threshold is reached
```

## Example 4: Scheduled Tasks

Edit `config/scheduler.json`:

```json
{
  "cron_jobs": [
    {
      "id": "daily_report",
      "schedule": "0 9 * * *",
      "enabled": true,
      "task": {
        "type": "custom",
        "handler": "generate_daily_report",
        "params": {
          "recipients": ["admin"]
        }
      },
      "description": "Generate daily usage report at 9 AM"
    }
  ]
}
```

The scheduler will automatically run these tasks.

## Example 5: Using Retry Policy

```javascript
import RetryPolicy from './src/retry-policy.js';

const retry = new RetryPolicy({
  maxAttempts: 3,
  initialDelay: 1000,
  backoffFactor: 2
});

// Wrap any operation that might fail
const result = await retry.execute(async () => {
  // Your operation here
  const response = await fetch('https://api.example.com/data');
  return await response.json();
}, 'API fetch');
```

## Example 6: Comprehensive Logging

```javascript
import Logger from './src/logger.js';

const logger = new Logger({
  level: 'debug',
  enableColors: true,
  enableTimestamp: true
});

logger.info('Application started');
logger.debug('Debug information');
logger.warn('Warning message');
logger.error('Error occurred');

// Change log level at runtime
logger.setLevel('trace');
```

## Example 7: Custom Skill Creation

Create `skills/workspace/greeting.js`:

```javascript
const greetingSkill = {
  name: 'greeting',
  version: '1.0.0',
  description: 'Generate personalized greetings',
  
  async execute(params) {
    const { name, time_of_day } = params;
    
    const greetings = {
      morning: `Good morning, ${name}!`,
      afternoon: `Good afternoon, ${name}!`,
      evening: `Good evening, ${name}!`
    };
    
    return {
      success: true,
      greeting: greetings[time_of_day] || `Hello, ${name}!`
    };
  }
};

export default greetingSkill;
```

Use it:

```javascript
const result = await agent.skills.executeSkill('greeting', {
  name: 'Alice',
  time_of_day: 'morning'
});

console.log(result.greeting); // "Good morning, Alice!"
```

## Example 8: Running Diagnostics

```bash
# Run full diagnostics
npm run doctor

# Attempt to fix issues
npm run fix

# View statistics
npm run stats
```

## Example 9: Complete Workflow

```javascript
import Agent0 from './src/agent.js';

async function main() {
  const agent = new Agent0();
  
  try {
    // Initialize all subsystems
    await agent.initialize();
    
    // Run health checks
    const health = await agent.healthCheck.runAll();
    if (health.unhealthy > 0) {
      agent.logger.warn(`${health.unhealthy} health checks failed`);
    }
    
    // Process messages
    await agent.process();
    
    // Get statistics
    const stats = await agent.getStatistics();
    agent.logger.info(`Processed ${stats.agent.stats.total_messages_processed} messages`);
    agent.logger.info(`Total API cost: $${stats.usage.total.cost.toFixed(4)}`);
    
    // Cleanup
    await agent.shutdown();
    
  } catch (error) {
    agent.logger.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
```

## Environment Setup

Ensure these environment variables are set:

```bash
export OPENAI_API_KEY="your-api-key"
export TELEGRAM_BOT_TOKEN="your-bot-token"
```

Or create a `.env` file (don't commit this!):

```
OPENAI_API_KEY=your-api-key
TELEGRAM_BOT_TOKEN=your-bot-token
```
