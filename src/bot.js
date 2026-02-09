import fs from 'fs/promises';
import MemoryEngine from './memory-engine.js';
import GitHubService from './github-service.js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const STATE_FILE = 'queue/last_id.json';

// Initialize memory and GitHub service
const memory = new MemoryEngine();
const github = new GitHubService();

async function run() {
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

You can help users with natural language requests. When users ask you to perform tasks like writing code, installing packages, or making changes, you can create a GitHub pull request using the createPR tool.

You remember all conversations and maintain context. Be helpful, transparent about your capabilities, and always preserve your personality.`;

        // 4. Get AI Response with function calling
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: text }
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'createPR',
                  description: 'Create a GitHub pull request for a code change task. Use this when the user requests code changes, new features, bug fixes, or any modifications to the repository.',
                  parameters: {
                    type: 'object',
                    properties: {
                      taskDescription: {
                        type: 'string',
                        description: 'Clear description of the task to be implemented'
                      }
                    },
                    required: ['taskDescription']
                  }
                }
              }
            ],
            tool_choice: 'auto'
          })
        });

        if (!aiResponse.ok) {
          console.error(`OpenAI API error: ${aiResponse.status} ${aiResponse.statusText}`);
          continue;
        }

        const aiData = await aiResponse.json();
        if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
          console.error("Invalid OpenAI API response structure");
          continue;
        }
        
        const message = aiData.choices[0].message;
        let replyText = message.content || '';

        // Handle tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const toolCall of message.tool_calls) {
            if (toolCall.function.name === 'createPR') {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                console.log(`Creating PR for task: ${args.taskDescription}`);
                
                const result = await github.createTaskPR({
                  taskDescription: args.taskDescription,
                  requestedBy: username,
                  userId: userId
                });
                
                replyText = `✅ I've created a pull request for your request!\n\n📝 **Task:** ${args.taskDescription}\n\n🔗 **PR Link:** ${result.pr_url}\n\n🤖 The changes will be implemented by GitHub Copilot. I'll notify you once the PR is ready for review!`;
              } catch (error) {
                console.error("Error creating PR:", error);
                replyText = `❌ I encountered an error creating the PR: ${error.message}`;
              }
            }
          }
        }

        // If no reply text and no tool calls, provide a default response
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

run().catch(console.error);
