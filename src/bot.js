import fs from 'fs/promises';
import MemoryEngine from './memory-engine.js';
import SkillManager from './skillManager.js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const STATE_FILE = 'queue/last_id.json';

// Initialize memory and skill manager
const memory = new MemoryEngine();
const skillManager = new SkillManager('./skills');

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

    if (chatId && text && userId) {
      console.log(`Processing message from ${chatId}: ${text}`);

      try {
        // 3. Get session context
        const sessionContext = await memory.getSessionContext(userId);

        // Load skills context
        const skillsContext = await skillManager.getSkillsContext();

        // Load soul/personality
        let soul = '';
        try {
          soul = await fs.readFile('agents/primary/soul.md', 'utf8');
        } catch (e) {
          console.log("Could not load soul.md");
        }

        // Build system prompt with session memory and skills
        const systemPrompt = `You are Agent0, an autonomous AI agent living in a GitHub repository.

${soul}

${skillsContext ? `\n## Available Skills\n${skillsContext}\n` : ''}

${sessionContext ? `\n## Session Context\n${sessionContext}\n` : ''}

You can help users with natural language requests. When users ask you to perform tasks like writing code, installing packages, or making changes, explain that you can create a GitHub issue or work with GitHub Copilot agents to help implement those changes through pull requests.

You remember all conversations and maintain context. Be helpful, transparent about your capabilities, and always preserve your personality.`;

        // 4. Get AI Response
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
            ]
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
        const replyText = aiData.choices[0].message.content;

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
