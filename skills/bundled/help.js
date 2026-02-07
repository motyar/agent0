/**
 * Help Skill - Provide assistance and documentation
 */
const helpSkill = {
  name: 'help',
  version: '1.0.0',
  description: 'Provide help and documentation for available skills',
  
  metadata: {
    author: 'Agent0',
    category: 'utility',
    tags: ['help', 'documentation', 'support']
  },
  
  async execute(params) {
    const { topic, ...args } = params;
    
    if (!topic) {
      return this.generalHelp();
    }
    
    switch (topic) {
      case 'skills':
        return this.skillsHelp();
      
      case 'commands':
        return this.commandsHelp();
      
      case 'setup':
        return this.setupHelp();
      
      default:
        return {
          success: false,
          error: `Unknown help topic: ${topic}`,
          available_topics: ['skills', 'commands', 'setup']
        };
    }
  },
  
  generalHelp() {
    return {
      success: true,
      message: 'Agent0 Help System',
      description: 'I am Agent0, an autonomous AI agent running on GitHub Actions',
      available_topics: [
        'skills - Learn about available skills',
        'commands - See available commands',
        'setup - Setup and configuration help'
      ],
      usage: 'Use the help skill with a topic parameter to learn more'
    };
  },
  
  skillsHelp() {
    return {
      success: true,
      message: 'Skills System',
      description: 'Skills are modular capabilities that extend Agent0 functionality',
      skill_types: [
        'bundled - Built-in skills that come with Agent0',
        'managed - Installed skills from external sources',
        'workspace - Custom skills specific to your workspace'
      ],
      examples: [
        'core - Essential system operations',
        'github - GitHub API integrations',
        'help - This help system'
      ]
    };
  },
  
  commandsHelp() {
    return {
      success: true,
      message: 'Available Commands',
      commands: [
        'npm run start - Start the agent',
        'npm run poll - Poll for Telegram messages',
        'npm run doctor - Run system diagnostics',
        'npm run fix - Attempt to fix common issues',
        'npm run stats - View agent statistics'
      ]
    };
  },
  
  setupHelp() {
    return {
      success: true,
      message: 'Setup and Configuration',
      steps: [
        '1. Create a Telegram bot via @BotFather',
        '2. Add TELEGRAM_BOT_TOKEN to GitHub secrets',
        '3. Add OPENAI_API_KEY to GitHub secrets',
        '4. Enable GitHub Actions in your repository',
        '5. Wait for the cron job to run (every 5 minutes)'
      ],
      configuration_files: [
        'agents/primary/identity.json - Agent configuration',
        'agents/primary/soul.md - Agent personality',
        'config/scheduler.json - Scheduled tasks',
        'AGENTS.md - Multi-agent routing',
        'TOOLS.md - Tool configuration'
      ]
    };
  }
};

export default helpSkill;
