import fs from 'fs/promises';
import { CopilotClient } from '@github/copilot-sdk';
import MemoryEngine from './memory-engine.js';
import GitHubService from './github-service.js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const STATE_FILE = 'queue/last_id.json';

// Initialize memory and GitHub service
const memory = new MemoryEngine();
const github = new GitHubService();

// Initialize Copilot SDK client
// The client authenticates via GITHUB_TOKEN environment variable
// which is automatically provided by GitHub Actions
const copilotClient = new CopilotClient();
let copilotReady = false;

// Session cache to reuse sessions per user
const userSessions = new Map();

async function run() {
  // Initialize Copilot client once
  if (!copilotReady) {
    try {
      await copilotClient.start();
      copilotReady = true;
      console.log("Copilot SDK client started successfully");
    } catch (error) {
      console.error("Failed to start Copilot SDK client:", error);
      throw error;
    }
  }

  // 1. Load state
  let lastId = 0;
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    lastId = JSON.parse(data).last_update_id;
  } catch (e) {
    console.log("No previous state found, starting fresh.");
  }

  // 2. Check for new messages
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${lastId + 1}`);
  if (!response.ok) {
    console.error(`Telegram API error: ${response.status} ${response.statusText}`);
    return;
  }
  const updates = await response.json();

  if (!updates.ok || !updates.result || updates.result.length === 0) {
    console.log("No new messages.");
    return;
  }

  for (const update of updates.result) {
    const chatId = update.message?.chat?.id;
    const text = update.message?.text;
    const userId = update.message?.from?.id;
    const username = update.message?.from?.username || 'user';

    if (chatId && text && userId) {
      console.log(`Processing message from ${chatId}: ${text}`);

      try {
        // 3. Get session context
        const sessionContext = await memory.getSessionContext(userId);

        // Load soul/personality
        let soul = '';
        try {
          soul = await fs.readFile('agents/primary/soul.md', 'utf8');
        } catch (e) {
          console.log("Could not load soul.md");
        }

        // Build system prompt with session memory
        const systemPrompt = `You are Agent0, an autonomous AI agent living in a GitHub repository.

${soul}

${sessionContext ? `\n## Session Context\n${sessionContext}\n` : ''}

You can help users with natural language requests. When users ask you to perform tasks like writing code, installing packages, or making changes, you can create a GitHub issue and assign it to the Copilot agent using the createIssue tool. The Copilot agent will then process the issue and automatically create a pull request with the implementation.

You remember all conversations and maintain context. Be helpful, transparent about your capabilities, and always preserve your personality.`;

        // Define the createIssue tool for Copilot SDK
        const createIssueTool = {
          name: 'createIssue',
          description: 'Create a GitHub issue and assign it to Copilot agent for code changes. Use this when the user requests code changes, new features, bug fixes, or any modifications to the repository. Copilot will process the issue and create a PR automatically.',
          parameters: {
            type: 'object',
            properties: {
              taskDescription: {
                type: 'string',
                description: 'Clear description of the task to be implemented'
              }
            },
            required: ['taskDescription']
          },
          handler: async (args) => {
            try {
              console.log(`Creating issue for task: ${args.taskDescription}`);
              
              const result = await github.createTaskIssue({
                taskDescription: args.taskDescription,
                requestedBy: username,
                userId: userId
              });
              
              return {
                content: [{
                  type: 'text',
                  text: `✅ I've created a GitHub issue and assigned it to Copilot agent!\n\n📝 **Task:** ${args.taskDescription}\n\n🔗 **Issue Link:** ${result.issue_url}\n\n🤖 The GitHub Copilot agent will process this issue, implement the changes, and create a pull request automatically. I'll let you know once it's ready for review!`
                }]
              };
            } catch (error) {
              console.error("Error creating issue:", error);
              return {
                content: [{
                  type: 'text',
                  text: `❌ I encountered an error creating the issue: ${error.message}`
                }]
              };
            }
          }
        };

        // 4. Create or reuse Copilot session
        // Note: Sessions are reused for efficiency, but conversation history
        // is managed by our memory-engine.js and loaded via sessionContext.
        // Each message includes the full context from memory in the system prompt.
        let session = userSessions.get(userId);
        if (!session) {
          session = await copilotClient.createSession({
            model: 'gpt-4o-mini',
            tools: [createIssueTool]
          });
          userSessions.set(userId, session);
          console.log(`Created new session for user ${userId}`);
        }

        // Build the conversation with system prompt and user message
        const response = await session.sendAndWait({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ]
        });

        let replyText = '';
        
        // Extract reply from Copilot SDK response
        if (response?.data?.content) {
          if (typeof response.data.content === 'string') {
            replyText = response.data.content;
          } else if (Array.isArray(response.data.content)) {
            // Handle array of content items
            replyText = response.data.content
              .map(item => item.text || item.content || '')
              .join('');
          }
        }

        // If no reply text, provide a default response
        if (!replyText) {
          replyText = "I processed your message but don't have a specific response. Please try again!";
        }

        // 5. Save to memory (both long-term and session)
        await memory.remember(userId, text, replyText);
        await memory.updateSession(userId, text, replyText);

        // 6. Send Reply
        const sendResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: replyText })
        });

        if (!sendResponse.ok) {
          console.error(`Failed to send message: ${sendResponse.status} ${sendResponse.statusText}`);
        }
      } catch (error) {
        console.error("Error processing message:", error);
        // Send error message to user
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Sorry, I encountered an error: ${error.message}`
          })
        });
      }
    }

    lastId = update.update_id;

    // Save state after each message to prevent reprocessing on crash
    await fs.mkdir('queue', { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify({ last_update_id: lastId }));
  }
}

// Cleanup function
async function cleanup() {
  // Clear session cache (sessions are automatically cleaned up by client.stop())
  userSessions.clear();
  
  // Stop the Copilot client (this closes all active sessions)
  if (copilotReady) {
    try {
      console.log("Stopping Copilot SDK client...");
      await copilotClient.stop();
      console.log("Copilot SDK client stopped");
      copilotReady = false;
    } catch (error) {
      console.error("Error stopping Copilot SDK client:", error);
    }
  }
}

// Handle process termination signals
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, cleaning up...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, cleaning up...');
  await cleanup();
  process.exit(0);
});

// Run
run().catch(async (error) => {
  console.error("Fatal error:", error);
  await cleanup();
  process.exit(1);
});
