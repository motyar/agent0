# Tools Configuration

## Overview

This file defines the tools and integrations available to Agent0.

## Built-in Tools

### Communication
- **Telegram**: Message sending and receiving
- **Presence Indicators**: Show online/typing status

### Memory & Storage
- **Memory Engine**: Conversation history storage
- **Session Pruning**: Automatic context management

### Execution
- **Code Execution**: Run code snippets safely
- **Sandbox Mode**: Docker-based isolation for non-main sessions

## External Integrations

### APIs
- **OpenAI**: Language model integration
- **Usage Tracking**: Monitor API usage and costs

### Development
- **Hot Reload**: Auto-reload on code changes
- **Debug Tools**: Built-in debugging capabilities
- **Doctor Command**: Diagnose and fix configuration issues

## Tool Configuration

### Retry Policy
All external API calls use automatic retry with exponential backoff:
```json
{
  "retry": {
    "max_attempts": 3,
    "initial_delay": 1000,
    "max_delay": 10000,
    "backoff_factor": 2
  }
}
```

### Streaming Support
Real-time response delivery:
```json
{
  "streaming": {
    "enabled": true,
    "chunk_size": 100,
    "flush_interval": 500
  }
}
```

## Custom Tools

Custom tools can be added to the `tools/` directory. Each tool should:
1. Export a class implementing the Tool interface
2. Define required permissions
3. Include error handling and validation

## Health Checks

Tools can implement health check endpoints for monitoring:
```javascript
class Tool {
  async healthCheck() {
    return {
      status: 'healthy',
      latency: 50,
      error: null
    };
  }
}
```
