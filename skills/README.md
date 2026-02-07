# Skills System

The Skills Engine provides a modular, auto-discovery system for extending Agent0's capabilities.

## Overview

Skills are JavaScript modules that provide specific functionality. The Skills Engine automatically discovers and loads skills from three directories:

- **bundled/** - Built-in skills that ship with Agent0
- **managed/** - Skills installed from external sources
- **workspace/** - Custom skills specific to your workspace

## Skill Structure

A skill is a JavaScript file that exports an object with the following structure:

```javascript
const mySkill = {
  name: 'skill_name',           // Required: Unique identifier
  version: '1.0.0',             // Required: Semantic version
  description: 'Description',   // Required: Brief description
  
  metadata: {                   // Optional: Additional metadata
    author: 'Name',
    category: 'utility',
    tags: ['tag1', 'tag2'],
    requires: ['ENV_VAR']       // Required environment variables
  },
  
  async execute(params) {       // Required: Execution function
    // Your skill logic here
    return {
      success: true,
      // ... your results
    };
  }
};

export default mySkill;
```

## Creating a Skill

### 1. Choose a Location

- **bundled/** - For core skills that are part of Agent0
- **managed/** - For skills installed via package managers or external sources
- **workspace/** - For custom, project-specific skills

### 2. Create the Skill File

Create a `.js` file in the appropriate directory:

```bash
# For workspace skills
touch skills/workspace/my-custom-skill.js
```

### 3. Implement the Skill

```javascript
const myCustomSkill = {
  name: 'my_custom',
  version: '1.0.0',
  description: 'My custom skill description',
  
  async execute(params) {
    const { action, ...args } = params;
    
    switch (action) {
      case 'do_something':
        // Your logic here
        return {
          success: true,
          result: 'Done!'
        };
      
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`
        };
    }
  }
};

export default myCustomSkill;
```

### 4. Test Your Skill

The skill will be automatically discovered on the next agent initialization. You can test it by executing:

```javascript
const engine = new SkillsEngine();
await engine.initialize();

const result = await engine.execute('my_custom', {
  action: 'do_something',
  // additional parameters
});
```

## Built-in Skills

### core
Essential system operations and utilities.

**Actions:**
- `ping` - Check if skill is responsive
- `status` - Get system status
- `echo` - Echo back a message
- `help` - Show help message

**Example:**
```javascript
await engine.execute('core', { action: 'status' });
```

### github
GitHub API operations and integrations.

**Actions:**
- `status` - Check GitHub integration status
- `create_issue` - Create a GitHub issue
- `create_pr` - Create a pull request
- `help` - Show help message

**Requirements:**
- `GITHUB_TOKEN` environment variable
- `GITHUB_REPOSITORY` environment variable

**Example:**
```javascript
await engine.execute('github', {
  action: 'create_issue',
  title: 'Bug report',
  body: 'Description of the bug'
});
```

### help
Provide assistance and documentation.

**Topics:**
- `skills` - Learn about available skills
- `commands` - See available commands
- `setup` - Setup and configuration help

**Example:**
```javascript
await engine.execute('help', { topic: 'skills' });
```

### memory_search
Search conversation history (legacy, being enhanced).

### conversation
Conversation management utilities (legacy).

## Best Practices

### 1. Error Handling

Always return a consistent response format:

```javascript
// Success
return {
  success: true,
  // ... results
};

// Error
return {
  success: false,
  error: 'Error message'
};
```

### 2. Parameter Validation

Validate parameters before processing:

```javascript
async execute(params) {
  const { required_param } = params;
  
  if (!required_param) {
    return {
      success: false,
      error: 'required_param is missing'
    };
  }
  
  // Process...
}
```

### 3. Environment Variables

Document required environment variables in metadata:

```javascript
metadata: {
  requires: ['API_KEY', 'API_URL']
}
```

Check for them in your execute function:

```javascript
async execute(params) {
  if (!process.env.API_KEY) {
    return {
      success: false,
      error: 'API_KEY environment variable is required'
    };
  }
  // ...
}
```

### 4. Async Operations

Always use async/await for I/O operations:

```javascript
async execute(params) {
  const data = await fetchData();
  const processed = await processData(data);
  return { success: true, result: processed };
}
```

### 5. Logging

Use console methods for logging:

```javascript
console.log('ℹ️ Processing request...');
console.error('❌ Error occurred:', error);
console.warn('⚠️ Warning:', warning);
```

## Skills Engine API

### Initialize

```javascript
const engine = new SkillsEngine();
await engine.initialize();
```

### Execute a Skill

```javascript
const result = await engine.execute('skill_name', {
  action: 'action_name',
  // additional parameters
});
```

### List Available Skills

```javascript
const skills = engine.list();
// Returns: [{ name, type, description, version }, ...]
```

### Get Skill Information

```javascript
const skill = engine.get('skill_name');
// Returns: { name, type, description, version, execute, path, metadata }
```

### Check if Skill Exists

```javascript
const exists = engine.has('skill_name');
// Returns: boolean
```

### Get Skills by Type

```javascript
const bundled = engine.getByType('bundled');
const workspace = engine.getByType('workspace');
```

### Get Statistics

```javascript
const stats = engine.getStatistics();
// Returns: { total, bundled, managed, workspace, unknown }
```

### Reload Skills

```javascript
await engine.reload();
// Clears and reloads all skills
```

## Advanced Topics

### Skill Dependencies

If your skill depends on other skills, document it in metadata:

```javascript
metadata: {
  depends_on: ['core', 'github']
}
```

### Skill Categories

Use categories to organize skills:

```javascript
metadata: {
  category: 'integration' // or 'utility', 'system', 'ai', etc.
}
```

### Skill Versioning

Follow semantic versioning:
- MAJOR: Breaking changes
- MINOR: New features, backwards compatible
- PATCH: Bug fixes

### Skill Packaging

For distributing skills:

1. Create a repository for your skill
2. Include proper documentation
3. Add metadata about dependencies
4. Provide installation instructions
5. Consider publishing to npm

## Troubleshooting

### Skill Not Loading

- Check file extension is `.js`
- Verify file is in correct directory
- Ensure skill structure is valid
- Check console for error messages

### Skill Execution Fails

- Verify required environment variables are set
- Check parameters are correct
- Review error messages in console
- Add logging to skill code for debugging

### Auto-Discovery Issues

- Ensure directories exist
- Check file permissions
- Verify import statements work
- Look for syntax errors in skill files

## Future Enhancements

Planned improvements to the Skills Engine:

- [ ] Hot reload without restart
- [ ] Skill marketplace integration
- [ ] Automatic dependency management
- [ ] Skill testing framework
- [ ] Performance monitoring
- [ ] Rate limiting and quotas
- [ ] Skill sandboxing for security

## Contributing

To contribute a new bundled skill:

1. Create skill in `skills/bundled/`
2. Follow the skill structure guidelines
3. Add comprehensive error handling
4. Document all actions and parameters
5. Submit a pull request

## License

Skills inherit the license of the Agent0 project (MIT).
