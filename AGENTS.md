# Agent Configuration

## Overview

This file defines the behavior and configuration of agents in the Agent0 system.

## Agent Types

### Primary Agent
- **Name**: Agent0
- **Type**: Autonomous Telegram Bot
- **Platform**: GitHub Actions
- **Model**: gpt-4o-mini
- **Purpose**: Learn, grow, and serve users through intelligent conversation

### Multi-Agent Routing

The system supports multi-agent routing, allowing different channels or contexts to be routed to isolated agent instances.

#### Configuration

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

## Agent Capabilities

Agents can have different capability sets:
- **conversation**: Basic chat capabilities
- **memory**: Remember and recall past conversations
- **learning**: Self-improvement and skill acquisition
- **code_generation**: Generate and execute code
- **web_search**: Search the internet for information
- **tool_execution**: Execute external tools and commands

## Configuration Files

Each agent should have:
- `identity.json` - Metadata and statistics
- `soul.md` - Personality and purpose
- Configuration for capabilities and constraints

## Workspace Configuration

Workspace-level configurations can override agent defaults. See individual agent directories for specific configurations.
