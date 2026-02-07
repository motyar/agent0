# Integration Examples

This document provides examples of how to use Agent0 features together.

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

## Example 2: Scheduled Tasks

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

## Example 3: Custom Skill Creation

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

## Example 4: Complete Workflow

```javascript
import Agent0 from './src/agent.js';

async function main() {
  const agent = new Agent0();
  
  try {
    // Initialize all subsystems
    await agent.initialize();
    
    // Process messages
    await agent.process();
    
    console.log('Processing complete');
    
    // Cleanup
    await agent.shutdown();
    
  } catch (error) {
    console.error('Fatal error:', error);
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
