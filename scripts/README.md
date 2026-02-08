# Skills.sh Integration

This directory contains scripts for managing the Skills.sh integration in Agent0.

## Setup Script

### setup-skills.sh

Initializes the Skills.sh integration and installs the pre-requisite `find-skills` skill.

**Usage:**
```bash
bash scripts/setup-skills.sh
```

**What it does:**
1. Creates necessary skill directories (`skills/managed`, `skills/workspace`, `.agents/skills`)
2. Installs the `find-skills` skill from vercel-labs/skills if not already installed
3. Lists all installed skills
4. Provides usage instructions

**When to use:**
- First-time setup of a new Agent0 instance
- After cloning the repository
- To verify skills installation

Note: The GitHub Actions workflow automatically runs this setup on every agent execution, so manual setup is optional for production use.

## Skills Directories

- **`.agents/skills/`** - Skills installed via the Skills CLI (npx skills)
  - Managed by `npx skills` commands
  - Pre-installed: `find-skills` from vercel-labs/skills

- **`skills/managed/`** - Skills.sh SKILL.md files from external sources
  - Manually managed or installed via agent

- **`skills/workspace/`** - Custom SKILL.md files specific to your workspace
  - Custom skills you create for your project

## Skills CLI Commands

### Find Skills
```bash
npx skills find [query]
```
Search for skills in the ecosystem.

### Add Skills
```bash
npx skills add <package> [options]
```
Install skills from GitHub or other sources.

Options:
- `--skill <name>` - Install specific skill(s)
- `--yes` or `-y` - Skip confirmation prompts
- `--global` or `-g` - Install globally

### List Skills
```bash
npx skills list
```
List all installed skills.

### Remove Skills
```bash
npx skills remove [skills]
```
Remove installed skills.

### Update Skills
```bash
npx skills update
```
Update all skills to latest versions.

## Pre-installed Skills

### find-skills (vercel-labs/skills)

Helps discover and install skills from the open agent skills ecosystem.

**When the agent uses this skill:**
- User asks "how do I do X" where X might be a common task
- User says "find a skill for X" or "is there a skill for X"
- User asks "can you do X" where X is a specialized capability
- User expresses interest in extending agent capabilities

**Example interactions:**
```
User: How do I improve React performance?
Agent: I found a skill that might help! The "vercel-react-best-practices" skill...

User: Find a skill for API testing
Agent: Let me search for API testing skills...
```

## For Developers

### Adding New Skills

1. **Via Skills CLI:**
   ```bash
   npx skills add <owner/repo> --skill <skill-name> --yes
   ```

2. **Via Agent (Natural Language):**
   ```
   You: Install the vercel/code-review skill
   Agent0: I've successfully installed the skill!
   ```

3. **Manually:**
   - Add SKILL.md file to `skills/managed/` or `skills/workspace/`
   - Skills are auto-loaded on next agent initialization

### Testing Skills Integration

```javascript
import SkillManager from './src/skillManager.js';

const skillManager = new SkillManager('./skills');

// List all skills
const skills = await skillManager.listSkills();
console.log(skills);

// Get skills context
const context = await skillManager.getSkillsContext();
console.log(context);
```

## Resources

- Skills.sh Directory: https://skills.sh
- Skills CLI Documentation: https://github.com/vercel-labs/skills
- Agent0 Skills Documentation: [/skills/README.md](/skills/README.md)
