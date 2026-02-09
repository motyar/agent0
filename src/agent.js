#!/usr/bin/env node

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { Type } from '@sinclair/typebox';
import TelegramService from './telegram.js';
import MemoryEngine from './memory-engine.js';
import Scheduler from './scheduler.js';
import SkillsManager from './skills-manager.js';
import SkillManager from './skillManager.js';
import GitHubService from './github-service.js';
import AgentRouter from './agent-router.js';
import Sandbox from './sandbox.js';
import HotReload from './hot-reload.js';
import WebSearch from './web-search.js';
import TaskQueue from './task-queue.js';

class Agent0 {
  constructor(options = {}) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.telegram = new TelegramService();
    this.memory = new MemoryEngine();
    this.scheduler = new Scheduler();
    this.skills = new SkillsManager();
    this.skillManager = new SkillManager('./skills');
    this.github = new GitHubService();
    this.taskQueue = new TaskQueue();
    
    // Phase 3 features
    this.router = new AgentRouter();
    this.sandbox = new Sandbox();
    this.hotReload = options.enableHotReload ? new HotReload(this) : null;
    this.webSearch = new WebSearch();

    this.identity = null;
    this.soul = null;
    this.skillsContext = '';
    this.streamingEnabled = options.enableStreaming !== false; // Default true
    
    // Define tool schemas using TypeBox for better validation
    this.toolSchemas = this.defineToolSchemas();
    
    // Define tools for OpenAI function calling
    this.tools = this.buildTools();
  }

  /**
   * Define tool schemas using TypeBox
   */
  defineToolSchemas() {
    return {
      install_skill: Type.Object({
        ownerRepo: Type.String({
          description: 'Repository in format "owner/repo", e.g., "vercel/code-review"',
          pattern: '^[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+$'
        })
      }),
      list_skills: Type.Object({}),
      remove_skill: Type.Object({
        skillName: Type.String({
          description: 'Name of the skill file to remove, e.g., "code-review.md"'
        })
      }),
      create_pr: Type.Object({
        taskDescription: Type.String({
          description: 'Description of the task to implement',
          minLength: 10,
          maxLength: 500
        })
      }),
      execute_code_sandbox: Type.Object({
        code: Type.String({
          description: 'Code to execute in sandbox',
          maxLength: 50000
        }),
        language: Type.Optional(Type.Union([
          Type.Literal('javascript'),
          Type.Literal('python'),
          Type.Literal('bash')
        ], {
          description: 'Programming language',
          default: 'javascript'
        }))
      }),
      web_search: Type.Object({
        query: Type.String({
          description: 'Search query',
          minLength: 1,
          maxLength: 200
        }),
        maxResults: Type.Optional(Type.Number({
          description: 'Maximum number of results',
          minimum: 1,
          maximum: 10,
          default: 5
        }))
      }),
      semantic_memory_search: Type.Object({
        query: Type.String({
          description: 'Semantic search query to find relevant past conversations',
          minLength: 1
        }),
        limit: Type.Optional(Type.Number({
          description: 'Maximum number of results',
          minimum: 1,
          maximum: 10,
          default: 5
        }))
      })
    };
  }

  /**
   * Build tools array from schemas
   */
  buildTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'install_skill',
          description: 'Install a skill from Skills.sh repository. Skills extend the agent\'s capabilities with new instructions and best practices.',
          parameters: {
            type: 'object',
            properties: {
              ownerRepo: {
                type: 'string',
                description: 'Repository in format "owner/repo", e.g., "vercel/code-review"'
              }
            },
            required: ['ownerRepo']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_skills',
          description: 'List all installed Skills.sh skills. Shows the skills currently available to the agent.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'remove_skill',
          description: 'Remove an installed skill by its filename. This uninstalls the skill from the agent.',
          parameters: {
            type: 'object',
            properties: {
              skillName: {
                type: 'string',
                description: 'Name of the skill file to remove, e.g., "code-review.md"'
              }
            },
            required: ['skillName']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_pr',
          description: 'Create a pull request for a task. The PR will be created for GitHub Copilot agents to implement.',
          parameters: {
            type: 'object',
            properties: {
              taskDescription: {
                type: 'string',
                description: 'Description of the task to implement, must be at least 10 characters'
              }
            },
            required: ['taskDescription']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'execute_code_sandbox',
          description: 'Execute code in an isolated Docker sandbox environment. Safe for running untrusted code with no network access.',
          parameters: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Code to execute in the sandbox'
              },
              language: {
                type: 'string',
                enum: ['javascript', 'python', 'bash'],
                description: 'Programming language (default: javascript)',
                default: 'javascript'
              }
            },
            required: ['code']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for information. Returns relevant web pages and snippets.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results (default: 5)',
                minimum: 1,
                maximum: 10
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'semantic_memory_search',
          description: 'Search past conversations using semantic similarity. Finds conversations related to a topic even if they don\'t use the exact same words.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Semantic search query'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 5)',
                minimum: 1,
                maximum: 10
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new task in the queue. Tasks are processed asynchronously one by one.',
          parameters: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'Description of the task to perform'
              },
              type: {
                type: 'string',
                description: 'Type of task (general, code, research, etc.)',
                enum: ['general', 'code', 'research', 'skill', 'memory']
              },
              params: {
                type: 'object',
                description: 'Additional parameters for the task'
              }
            },
            required: ['description']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_tasks',
          description: 'List tasks in the queue. Can filter by status (pending, processing, completed, failed).',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                description: 'Filter by task status',
                enum: ['pending', 'processing', 'completed', 'failed', 'all']
              },
              limit: {
                type: 'number',
                description: 'Maximum number of tasks to return',
                minimum: 1,
                maximum: 20
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_task_status',
          description: 'Get the status and details of a specific task by its ID.',
          parameters: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'The task ID to check'
              }
            },
            required: ['taskId']
          }
        }
      }
    ];
  }

  async initialize() {
    console.log('Agent0 initializing...');

    // Load identity
    const identityData = await fs.readFile('agents/primary/identity.json', 'utf-8');
    this.identity = JSON.parse(identityData);

    // Load soul
    this.soul = await fs.readFile('agents/primary/soul.md', 'utf-8');

    // Initialize subsystems
    await this.scheduler.initialize();
    await this.skills.initialize();
    await this.taskQueue.initialize();
    
    // Initialize Skills.sh integration
    await this.skillManager.ensureDirectories();
    this.skillsContext = await this.skillManager.getSkillsContext();

    // Initialize agent router for multi-agent collaboration
    await this.router.initialize();
    
    // Start hot reload if enabled
    if (this.hotReload) {
      this.hotReload.start();
      console.log('🔥 Hot reload enabled');
    }

    console.log(`Agent0 v${this.identity.version} ready`);
    console.log(`Soul loaded (${this.soul.length} characters)`);
    
    if (this.skillsContext) {
      console.log(`Skills.sh integration loaded (${this.skillsContext.length} characters)`);
    }
    
    if (this.router.isEnabled()) {
      const agents = this.router.getAvailableAgents();
      console.log(`Multi-agent routing enabled (${agents.length} agents: ${agents.join(', ')})`);
    }
  }



  async think(message, conversationContext) {
    // Build skills section if skills are loaded
    // Note: For large skill sets, consider implementing skill selection or pagination
    // to prevent excessive prompt sizes. Current implementation injects all skills.
    const skillsSection = this.skillsContext 
      ? `\n**AVAILABLE SKILLS FROM Skills.sh:**\n${this.skillsContext}\n\nYou can use these skills to enhance your responses and capabilities.\n` 
      : '';
    
    const systemPrompt = `You are Agent0, an autonomous AI agent running on GitHub Actions.

**YOUR SOUL:**
${this.soul}
${skillsSection}

**INSTRUCTIONS:**
- Respond naturally and helpfully
- Remember you respond every 5 minutes (not in real-time)
- Be honest about your limitations
- Keep responses concise (under 300 words)
- Use your memory of past conversations
- You have access to tools for skill management, PR creation, and task queue management
- When users ask to do something complex, you can create a task for asynchronous processing
- Tasks are processed one by one in the background and users are notified when complete
- Users can check task status using the task management tools
- When users ask to install skills, list skills, remove skills, create PRs, or manage tasks, use the appropriate tools`;

    const userPrompt = `**CONVERSATION HISTORY:**
${conversationContext || 'No previous conversation'}

**CURRENT MESSAGE:**
User: ${message.text}

Respond now:`;

    console.log('Thinking...');

    // Ensure we have model and max_tokens in identity
    const modelName = (this.identity && this.identity.model && this.identity.model.name) || 'gpt-4o-mini';
    const maxTokens = (this.identity && this.identity.model && this.identity.model.max_tokens) || 512;

    // Make API call with tool support
    try {
      const response = await this.openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: this.tools,
        tool_choice: 'auto',
        max_tokens: maxTokens
      });

      console.log(`Generated response (${response.usage?.total_tokens || 0} tokens)`);

      return response.choices[0].message;
    } catch (error) {
      console.error('Error calling OpenAI API:', error.message);
      throw error;
    }
  }



  async process() {
    try {
      console.log('🚀 Starting message processing...');
      
      // Initialize agent
      await this.initialize();
      
      // Load queue
      const queueData = await this.loadQueue();
      
      // Filter pending messages
      const pendingMessages = queueData.messages.filter(msg => msg.status === 'pending');
      
      if (pendingMessages.length === 0) {
        console.log('✅ No pending messages to process');
        return;
      }
      
      console.log(`📥 Processing ${pendingMessages.length} pending message(s)...`);
      
      // Process each message
      for (const message of pendingMessages) {
        try {
          await this.processMessage(message);
          
          // Update status in queue
          const msgIndex = queueData.messages.findIndex(m => m.update_id === message.update_id);
          if (msgIndex !== -1) {
            queueData.messages[msgIndex].status = 'processed';
            queueData.messages[msgIndex].processed_at = new Date().toISOString();
          }
        } catch (error) {
          console.error(`❌ Failed to process message ${message.message_id}:`, error.message);
          
          // Mark as failed
          const msgIndex = queueData.messages.findIndex(m => m.update_id === message.update_id);
          if (msgIndex !== -1) {
            queueData.messages[msgIndex].status = 'failed';
            queueData.messages[msgIndex].error = error.message;
          }
        }
      }
      
      // Save updated queue
      await this.saveQueue(queueData);
      
      // Update agent statistics
      const processedCount = queueData.messages.filter(m => m.status === 'processed').length;
      await this.updateStats(processedCount);
      
      console.log('✅ Message processing complete');
      
    } catch (error) {
      console.error('❌ Fatal error during message processing:', error);
      throw error;
    }
  }

  async processMessage(message) {
    try {
      console.log(`\n📨 Processing message from @${message.username} (${message.user_id})`);
      console.log(`   Text: "${message.text}"`);
      
      // Route message to appropriate agent if multi-agent is enabled
      const agentId = this.router.route(message, { userId: message.user_id });
      if (agentId !== 'primary') {
        console.log(`🔀 Routing to agent: ${agentId}`);
      }
      
      // Load conversation history for this user
      const history = await this.memory.recall(message.user_id, 10);
      
      // Format conversation context
      let conversationContext = '';
      if (history.length > 0) {
        conversationContext = history.map(turn => 
          `User: ${turn.user}\nBot: ${turn.bot}`
        ).join('\n\n');
        console.log(`📚 Loaded ${history.length} previous conversation turn(s)`);
      } else {
        console.log('📚 No previous conversation history');
      }
      
      // Generate response using think() - returns message object which may have tool_calls
      const assistantMessage = await this.think(message, conversationContext);
      
      let finalResponse = '';
      
      // Check if LLM wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log(`🔧 LLM requested ${assistantMessage.tool_calls.length} tool call(s)`);
        
        // Execute each tool call
        const toolResults = [];
        for (const toolCall of assistantMessage.tool_calls) {
          const toolResult = await this.executeTool(toolCall, message);
          toolResults.push(toolResult);
        }
        
        // Generate final response based on tool results
        finalResponse = await this.generateFinalResponse(message, conversationContext, assistantMessage, toolResults);
      } else {
        // No tool calls, use the content directly
        finalResponse = assistantMessage.content || 'I apologize, but I wasn\'t sure how to respond to that. Could you try rephrasing your request or ask me to list my capabilities?';
      }
      
      // Send response via Telegram
      await this.telegram.sendMessage(message.chat_id, finalResponse);
      console.log(`✅ Sent reply to @${message.username}`);
      
      // Save conversation to memory
      await this.memory.remember(message.user_id, message.text, finalResponse);
      console.log(`💾 Saved conversation for user ${message.user_id}`);
      
    } catch (error) {
      console.error(`❌ Error processing message:`, error);
      throw error;
    }
  }

  /**
   * Execute a tool call from the LLM
   */
  async executeTool(toolCall, message) {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);
    
    console.log(`🔧 Executing tool: ${functionName}`, args);
    
    try {
      let result;
      
      switch (functionName) {
        case 'install_skill':
          result = await this.handleToolInstallSkill(args.ownerRepo);
          break;
          
        case 'list_skills':
          result = await this.handleToolListSkills();
          break;
          
        case 'remove_skill':
          result = await this.handleToolRemoveSkill(args.skillName);
          break;
          
        case 'create_pr':
          result = await this.handleToolCreatePR(message, args.taskDescription);
          break;
          
        case 'execute_code_sandbox':
          result = await this.handleToolExecuteCodeSandbox(args.code, args.language);
          break;
          
        case 'web_search':
          result = await this.handleToolWebSearch(args.query, args.maxResults);
          break;
          
        case 'semantic_memory_search':
          result = await this.handleToolSemanticMemorySearch(message.user_id, args.query, args.limit);
          break;
          
        case 'create_task':
          result = await this.handleToolCreateTask(message, args.description, args.type, args.params);
          break;
          
        case 'list_tasks':
          result = await this.handleToolListTasks(message.user_id, args.status, args.limit);
          break;
          
        case 'get_task_status':
          result = await this.handleToolGetTaskStatus(args.taskId);
          break;
          
        default:
          result = { success: false, message: `Unknown tool: ${functionName}` };
      }
      
      return {
        tool_call_id: toolCall.id,
        role: 'tool',
        name: functionName,
        content: JSON.stringify(result)
      };
    } catch (error) {
      console.error(`❌ Error executing tool ${functionName}:`, error);
      return {
        tool_call_id: toolCall.id,
        role: 'tool',
        name: functionName,
        content: JSON.stringify({ success: false, message: error.message })
      };
    }
  }

  /**
   * Generate final natural language response after tool execution
   */
  async generateFinalResponse(message, conversationContext, assistantMessage, toolResults) {
    const modelName = (this.identity && this.identity.model && this.identity.model.name) || 'gpt-4o-mini';
    const maxTokens = (this.identity && this.identity.model && this.identity.model.max_tokens) || 512;
    
    try {
      // Build messages array for follow-up completion
      const messages = [
        {
          role: 'system',
          content: `You are Agent0. You just executed some tools. Now provide a natural, helpful response to the user based on the tool results. Be concise and friendly.`
        },
        {
          role: 'user',
          content: `User asked: ${message.text}`
        },
        {
          role: 'assistant',
          content: assistantMessage.content || null,
          tool_calls: assistantMessage.tool_calls
        },
        ...toolResults
      ];
      
      const response = await this.openai.chat.completions.create({
        model: modelName,
        messages: messages,
        max_tokens: maxTokens
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating final response:', error);
      // Fallback to a simple response based on tool results
      const successfulTools = toolResults.filter(r => {
        try {
          const parsed = JSON.parse(r.content);
          return parsed.success;
        } catch {
          return false;
        }
      });
      
      if (successfulTools.length > 0) {
        return 'I\'ve completed the requested action successfully!';
      } else {
        return 'I encountered an issue while trying to complete your request.';
      }
    }
  }

  /**
   * Tool handler: Install a skill
   */
  async handleToolInstallSkill(ownerRepo) {
    try {
      // Validate format before processing
      const validPattern = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
      if (!validPattern.test(ownerRepo)) {
        return {
          success: false,
          message: 'Invalid repository format. Use: owner/repo'
        };
      }
      
      const success = await this.skillManager.installSkill(ownerRepo);
      
      if (success) {
        // Reload skills context
        this.skillsContext = await this.skillManager.getSkillsContext();
        return {
          success: true,
          message: `Successfully installed skill: ${ownerRepo}`
        };
      } else {
        return {
          success: false,
          message: 'Failed to install skill. The repository may not exist or the skill format is invalid.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error installing skill: ${error.message}`
      };
    }
  }

  /**
   * Tool handler: List skills
   */
  async handleToolListSkills() {
    try {
      const skills = await this.skillManager.listSkills();
      
      return {
        success: true,
        skills: skills,
        count: skills.length,
        message: skills.length > 0 
          ? `Found ${skills.length} installed skill(s)` 
          : 'No Skills.sh skills installed yet'
      };
    } catch (error) {
      return {
        success: false,
        message: `Error listing skills: ${error.message}`
      };
    }
  }

  /**
   * Tool handler: Remove a skill
   */
  async handleToolRemoveSkill(skillName) {
    try {
      const success = await this.skillManager.removeSkill(skillName);
      
      if (success) {
        // Reload skills context
        this.skillsContext = await this.skillManager.getSkillsContext();
        return {
          success: true,
          message: `Successfully removed skill: ${skillName}`
        };
      } else {
        return {
          success: false,
          message: `Failed to remove skill: ${skillName}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error removing skill: ${error.message}`
      };
    }
  }

  /**
   * Tool handler: Create PR
   */
  async handleToolCreatePR(message, taskDescription) {
    try {
      // Validate task description
      if (!taskDescription || taskDescription.length < 10) {
        return {
          success: false,
          message: 'Task description must be at least 10 characters long'
        };
      }
      
      if (taskDescription.length > 500) {
        return {
          success: false,
          message: 'Task description is too long (max 500 characters)'
        };
      }
      
      if (!this.github.isAvailable()) {
        return {
          success: false,
          message: 'GitHub integration is not properly configured. GITHUB_TOKEN may be missing.'
        };
      }

      // Create the PR
      const result = await this.github.createTaskPR({
        taskDescription: taskDescription,
        requestedBy: message.username || message.first_name,
        userId: message.user_id
      });

      return {
        success: true,
        pr_number: result.pr_number,
        pr_url: result.pr_url,
        branch: result.branch,
        message: `PR #${result.pr_number} created successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating PR: ${error.message}`
      };
    }
  }

  /**
   * Tool handler: Execute code in sandbox
   */
  async handleToolExecuteCodeSandbox(code, language = 'javascript') {
    try {
      // Validate code
      const validation = this.sandbox.validateCode(code, language);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error
        };
      }

      // Check if Docker is available
      const dockerAvailable = await this.sandbox.isAvailable();
      if (!dockerAvailable) {
        return {
          success: false,
          message: 'Docker sandbox is not available. Docker must be installed and running.'
        };
      }

      // Execute code
      const result = await this.sandbox.executeCode(code, language);
      
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
        message: result.success ? 'Code executed successfully' : 'Code execution failed'
      };
    } catch (error) {
      return {
        success: false,
        message: `Sandbox execution error: ${error.message}`
      };
    }
  }

  /**
   * Tool handler: Web search
   */
  async handleToolWebSearch(query, maxResults = 5) {
    try {
      const searchResult = await this.webSearch.search(query, { maxResults });
      
      if (!searchResult.success) {
        return {
          success: false,
          message: searchResult.error || 'Search failed'
        };
      }

      return {
        success: true,
        query: searchResult.query,
        provider: searchResult.provider,
        results: searchResult.results,
        formatted: this.webSearch.formatResults(searchResult),
        message: `Found ${searchResult.results.length} result(s)`
      };
    } catch (error) {
      return {
        success: false,
        message: `Web search error: ${error.message}`
      };
    }
  }

  /**
   * Tool handler: Semantic memory search
   */
  async handleToolSemanticMemorySearch(userId, query, limit = 5) {
    try {
      const results = await this.memory.semanticSearch(userId, query, { limit });
      
      return {
        success: true,
        query,
        results: results.map(r => ({
          user: r.user,
          bot: r.bot,
          timestamp: r.timestamp,
          similarity: r.similarity
        })),
        count: results.length,
        message: `Found ${results.length} semantically similar conversation(s)`
      };
    } catch (error) {
      return {
        success: false,
        message: `Semantic search error: ${error.message}`
      };
    }
  }

  /**
   * Tool handler: Create a new task
   */
  async handleToolCreateTask(message, description, type = 'general', params = {}) {
    try {
      const task = await this.taskQueue.enqueueTask({
        userId: message.user_id,
        username: message.username,
        chatId: message.chat_id,
        description,
        type,
        params
      });
      
      // Save task creation to memory
      const taskInfo = `Created task: ${description} (ID: ${task.id}, Type: ${type})`;
      await this.memory.remember(message.user_id, `Create task: ${description}`, taskInfo);
      
      return {
        success: true,
        task: {
          id: task.id,
          description: task.description,
          type: task.type,
          status: task.status,
          createdAt: task.createdAt
        },
        message: `Task created successfully! ID: ${task.id}. It will be processed asynchronously.`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create task: ${error.message}`
      };
    }
  }

  /**
   * Tool handler: List tasks
   */
  async handleToolListTasks(userId, status = null, limit = 10) {
    try {
      let tasks;
      
      if (status && status !== 'all') {
        tasks = await this.taskQueue.getUserTasks(userId, status);
      } else {
        tasks = await this.taskQueue.getUserTasks(userId);
      }
      
      // Limit results
      tasks = tasks.slice(-limit).reverse();
      
      const stats = await this.taskQueue.getStats();
      
      return {
        success: true,
        tasks: tasks.map(t => ({
          id: t.id,
          description: t.description,
          type: t.type,
          status: t.status,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        })),
        count: tasks.length,
        stats,
        message: `Found ${tasks.length} task(s)${status ? ` with status: ${status}` : ''}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list tasks: ${error.message}`
      };
    }
  }

  /**
   * Tool handler: Get task status
   */
  async handleToolGetTaskStatus(taskId) {
    try {
      const task = await this.taskQueue.getTask(taskId);
      
      if (!task) {
        return {
          success: false,
          message: `Task not found: ${taskId}`
        };
      }
      
      return {
        success: true,
        task: {
          id: task.id,
          description: task.description,
          type: task.type,
          status: task.status,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
          failedAt: task.failedAt,
          error: task.error
        },
        message: `Task status: ${task.status}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get task status: ${error.message}`
      };
    }
  }

  async updateStats(messageCount) {
    try {
      console.log('📊 Updating agent statistics...');
      
      // Load current identity
      const identityData = await fs.readFile('agents/primary/identity.json', 'utf-8');
      const identity = JSON.parse(identityData);
      
      // Get memory summary for user count
      const memorySummary = await this.memory.getSummary();
      const uniqueUsers = memorySummary ? Object.keys(memorySummary.users).length : 0;
      
      // Update stats
      identity.stats.total_messages_processed = (identity.stats.total_messages_processed || 0) + messageCount;
      identity.stats.users_served = uniqueUsers;
      identity.stats.total_conversations = memorySummary ? memorySummary.total_conversations : 0;
      identity.last_updated = new Date().toISOString();
      
      // Save updated identity
      await fs.writeFile('agents/primary/identity.json', JSON.stringify(identity, null, 2));
      
      console.log(`✅ Stats updated: ${identity.stats.total_messages_processed} messages, ${identity.stats.users_served} users`);
      
    } catch (error) {
      console.error('❌ Error updating stats:', error);
      // Don't throw - stats update failure shouldn't break the whole process
    }
  }

  async loadQueue() {
    try {
      const data = await fs.readFile('queue/incoming.json', 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, return default structure
      return {
        last_update_id: 0,
        last_poll: null,
        messages: []
      };
    }
  }

  async saveQueue(queueData) {
    try {
      await fs.mkdir('queue', { recursive: true }).catch(() => {});
      await fs.writeFile('queue/incoming.json', JSON.stringify(queueData, null, 2));
      console.log('💾 Queue saved');
    } catch (error) {
      console.error('❌ Error saving queue:', error);
      throw error;
    }
  }



  /**
   * Process a PR by fetching task details and implementing the task
   */
  async processPR(prNumber) {
    try {
      // Dynamic import for Octokit since we're in ES module
      const { Octokit } = await import('@octokit/rest');
      
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
      
      console.log(`📋 Fetching PR #${prNumber}...`);
      
      // Get PR details
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      });
      
      // Extract task from PR body
      const taskMatch = pr.body.match(/\*\*Task:\*\* (.+)/);
      const task = taskMatch ? taskMatch[1] : process.env.TASK_DESCRIPTION || '';
      
      if (!task) {
        throw new Error('Could not extract task description from PR body');
      }
      
      console.log(`🎯 Task: ${task}`);
      
      // Use OpenAI to process the task
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are Agent0, an autonomous coding agent. Given a task description, you need to:
1. Analyze what needs to be done
2. Determine which files to create or modify
3. Generate the necessary code or content
4. Provide the implementation as a structured response

Respond in JSON format:
{
  "analysis": "brief analysis of the task",
  "files": [
    {
      "path": "file/path.ext",
      "action": "create|modify",
      "content": "file content"
    }
  ]
}

IMPORTANT: All file paths must be relative to the repository root and must not contain path traversal sequences (../).`
            },
            {
              role: 'user',
              content: `Task: ${task}\n\nRepository: ${owner}/${repo}\nBranch: ${pr.head.ref}`
            }
          ],
          temperature: 0.7
        })
      });
      
      const result = await response.json();
      
      if (!result.choices || !result.choices[0]) {
        throw new Error('Invalid response from OpenAI API');
      }
      
      let implementation;
      try {
        implementation = JSON.parse(result.choices[0].message.content);
      } catch (parseError) {
        throw new Error('Failed to parse AI response as JSON. Response may be malformed.');
      }
      
      console.log(`💡 Analysis: ${implementation.analysis}`);
      console.log(`📝 Will process ${implementation.files.length} file(s)`);
      
      // Get repository root path
      const repoRoot = process.cwd();
      
      // Implement the changes
      for (const file of implementation.files) {
        // Validate file path to prevent path traversal attacks
        const filePath = path.join(repoRoot, file.path);
        const resolvedPath = path.resolve(filePath);
        
        // Ensure the resolved path is within the repository root
        if (!resolvedPath.startsWith(repoRoot)) {
          console.error(`⚠️ Skipping ${file.path}: Path traversal detected`);
          continue;
        }
        
        console.log(`${file.action === 'create' ? '➕' : '✏️'} ${file.path}`);
        
        const dir = path.dirname(filePath);
        
        // Ensure directory exists
        await fs.mkdir(dir, { recursive: true });
        
        // Write the file
        await fs.writeFile(filePath, file.content, 'utf8');
      }
      
      console.log('✅ Task implementation complete!');
      
      return { success: true, task, implementation };
      
    } catch (error) {
      console.error('❌ Error processing PR:', error);
      throw error;
    }
  }

  /**
   * Process tasks from the task queue asynchronously
   * Tasks are processed one by one
   */
  async processTasks() {
    try {
      console.log('🔄 Starting task processing...');
      
      // Get next pending task
      const task = await this.taskQueue.getNextTask();
      
      if (!task) {
        console.log('✅ No pending tasks to process');
        return;
      }
      
      console.log(`📋 Processing task ${task.id}: ${task.description}`);
      
      // Mark as processing
      await this.taskQueue.markTaskProcessing(task.id);
      
      try {
        // Process the task based on type
        let result;
        
        switch (task.type) {
          case 'code':
            result = await this.processCodeTask(task);
            break;
          case 'research':
            result = await this.processResearchTask(task);
            break;
          case 'skill':
            result = await this.processSkillTask(task);
            break;
          case 'memory':
            result = await this.processMemoryTask(task);
            break;
          case 'general':
          default:
            result = await this.processGeneralTask(task);
            break;
        }
        
        // Mark task as complete
        await this.taskQueue.completeTask(task.id, result);
        
        // Send notification to user about completion
        await this.telegram.sendMessage(
          task.chatId,
          `✅ Task completed!\n\n📋 Task: ${task.description}\n🆔 ID: ${task.id}\n\n${result.message || 'Task finished successfully.'}`
        );
        
        // Save task completion to memory
        await this.memory.remember(
          task.userId,
          `Task ${task.id}: ${task.description}`,
          `Task completed successfully. ${result.message || ''}`
        );
        
        console.log(`✅ Task ${task.id} completed successfully`);
        
      } catch (error) {
        console.error(`❌ Task ${task.id} failed:`, error);
        
        // Mark task as failed
        await this.taskQueue.failTask(task.id, error.message);
        
        // Notify user about failure
        await this.telegram.sendMessage(
          task.chatId,
          `❌ Task failed!\n\n📋 Task: ${task.description}\n🆔 ID: ${task.id}\n\n⚠️ Error: ${error.message}`
        );
        
        // Save task failure to memory
        await this.memory.remember(
          task.userId,
          `Task ${task.id}: ${task.description}`,
          `Task failed with error: ${error.message}`
        );
      }
      
      // Clean up old tasks
      await this.taskQueue.cleanup();
      
    } catch (error) {
      console.error('❌ Fatal error during task processing:', error);
      throw error;
    }
  }

  /**
   * Process a general task
   */
  async processGeneralTask(task) {
    // Use LLM to process the task
    const prompt = `Process this task: ${task.description}\n\nParameters: ${JSON.stringify(task.params)}`;
    
    const response = await this.openai.chat.completions.create({
      model: this.identity?.model?.name || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are Agent0, processing a task asynchronously. Provide a clear and helpful response.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000
    });
    
    return {
      success: true,
      message: response.choices[0].message.content
    };
  }

  /**
   * Process a code task
   */
  async processCodeTask(task) {
    // Execute code in sandbox if available
    if (task.params.code) {
      const result = await this.sandbox.execute(task.params.code, task.params.language || 'javascript');
      return {
        success: true,
        message: `Code execution result:\n\`\`\`\n${result.output}\n\`\`\``,
        output: result.output
      };
    }
    
    return {
      success: false,
      message: 'No code provided in task parameters'
    };
  }

  /**
   * Process a research task
   */
  async processResearchTask(task) {
    // Use web search for research
    const query = task.params.query || task.description;
    const searchResults = await this.webSearch.search(query, { maxResults: 5 });
    
    return {
      success: true,
      message: `Research results for: ${query}\n\n${searchResults.map((r, i) => 
        `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.url}`
      ).join('\n\n')}`,
      results: searchResults
    };
  }

  /**
   * Process a skill task
   */
  async processSkillTask(task) {
    // Install or manage skills
    if (task.params.action === 'install' && task.params.ownerRepo) {
      const result = await this.skillManager.installSkill(task.params.ownerRepo);
      return {
        success: result,
        message: result ? `Successfully installed skill: ${task.params.ownerRepo}` : `Failed to install skill: ${task.params.ownerRepo}`
      };
    }
    
    return {
      success: false,
      message: 'Invalid skill task parameters'
    };
  }

  /**
   * Process a memory task
   */
  async processMemoryTask(task) {
    // Search or analyze memory
    if (task.params.action === 'search' && task.params.query) {
      const results = await this.memory.search(task.userId, task.params.query, { limit: 5 });
      return {
        success: true,
        message: `Found ${results.length} relevant conversations:\n\n${results.map((r, i) =>
          `${i + 1}. ${r.timestamp}\n   User: ${r.user.substring(0, 50)}...\n   Bot: ${r.bot.substring(0, 50)}...`
        ).join('\n\n')}`,
        results
      };
    }
    
    return {
      success: false,
      message: 'Invalid memory task parameters'
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    console.log('Shutting down Agent0...');
    
    // Stop scheduler
    this.scheduler.stop();
    
    // Stop hot reload if enabled
    if (this.hotReload) {
      await this.hotReload.stop();
    }
    
    console.log('Shutdown complete');
  }
}

// CLI
const command = process.argv[2];

if (command === 'process') {
  const agent = new Agent0();
  agent.process().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
} else if (command === 'process-tasks') {
  const agent = new Agent0();
  agent.initialize()
    .then(() => agent.processTasks())
    .then(() => {
      console.log('✅ Task processing complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error processing tasks:', error);
      process.exit(1);
    });
} else if (command === 'process-pr') {
  const prNumber = parseInt(process.argv[3]);
  
  if (!prNumber || isNaN(prNumber)) {
    console.error('❌ Error: PR number is required');
    console.log('Usage: node agent.js process-pr <pr-number>');
    process.exit(1);
  }
  
  const agent = new Agent0();
  agent.initialize()
    .then(() => agent.processPR(prNumber))
    .then(() => {
      console.log('✅ PR processed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error processing PR:', error);
      process.exit(1);
    });
} else {
  console.log('Usage: node agent.js [process|process-tasks|process-pr <pr-number>]');
  process.exit(1);
}

export default Agent0;
