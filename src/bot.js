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
        // Handle skill commands
        if (text.startsWith('/skill')) {
          await handleSkillCommand(chatId, text, skillManager);
        } else if (text.startsWith('/memory')) {
          await handleMemoryCommand(chatId, userId, text, memory);
        } else {
          // 3. Get session context
          const sessionContext = await memory.getSessionContext(userId);

          // Load skills context
          const skillsContext = await skillManager.getSkillsContext();

          // Build system prompt with session memory and skills
          const systemPrompt = `You are a helpful AI assistant with skills and memory.

${skillsContext ? `\n## Available Skills\n${skillsContext}\n` : ''}

${sessionContext ? `\n## Session Context\n${sessionContext}\n` : ''}

If the user asks to install a skill, guide them to use: /skill install owner/repo
If the user asks to list skills, guide them to use: /skill list
If the user asks about memory, guide them to use: /memory show or /memory clear`;

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

/**
 * Handle skill management commands
 */
async function handleSkillCommand(chatId, text, skillManager) {
  const parts = text.split(' ');
  const command = parts[1];

  try {
    if (command === 'install' && parts[2]) {
      const ownerRepo = parts[2];
      await sendMessage(chatId, `🔄 Installing skill: ${ownerRepo}...`);

      const success = await skillManager.installSkill(ownerRepo);

      if (success) {
        await sendMessage(chatId, `✅ Successfully installed skill: ${ownerRepo}\n\nThe skill is now available and loaded into my context.`);
      } else {
        await sendMessage(chatId, `❌ Failed to install skill: ${ownerRepo}`);
      }
    } else if (command === 'list') {
      const skills = await skillManager.listSkills();

      if (skills.length === 0) {
        await sendMessage(chatId, '📋 No skills installed yet.\n\nInstall a skill with: /skill install owner/repo');
      } else {
        const skillList = skills.map(s => `• ${s.name} (${s.type})`).join('\n');
        await sendMessage(chatId, `📋 Installed Skills (${skills.length}):\n\n${skillList}`);
      }
    } else if (command === 'remove' && parts[2]) {
      const skillName = parts[2];
      await sendMessage(chatId, `🔄 Removing skill: ${skillName}...`);

      const success = await skillManager.removeSkill(skillName);

      if (success) {
        await sendMessage(chatId, `✅ Successfully removed skill: ${skillName}`);
      } else {
        await sendMessage(chatId, `❌ Failed to remove skill: ${skillName}`);
      }
    } else {
      await sendMessage(chatId, `🛠️ Skill Commands:

/skill install owner/repo - Install a skill from GitHub
/skill list - List installed skills
/skill remove skill-name.md - Remove a skill

Example: /skill install vercel/code-review`);
    }
  } catch (error) {
    console.error('Error handling skill command:', error);
    await sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Handle memory commands
 */
async function handleMemoryCommand(chatId, userId, text, memory) {
  const parts = text.split(' ');
  const command = parts[1];

  try {
    if (command === 'show') {
      const session = await memory.getSession(userId);
      const messageCount = session.context.length;
      const created = new Date(session.created).toLocaleString();

      await sendMessage(chatId, `🧠 Active Session:

• Session ID: ${session.session_id}
• Created: ${created}
• Messages in session: ${messageCount}
• Context window: ${messageCount}/${memory.sessionContextWindow} messages

Use /memory clear to start a new session.`);
    } else if (command === 'clear') {
      await memory.clearSession(userId);
      await sendMessage(chatId, `✅ Session cleared! Starting fresh.`);
    } else {
      await sendMessage(chatId, `🧠 Memory Commands:

/memory show - Show current session info
/memory clear - Clear session and start fresh

Your conversations are saved automatically and I remember context from our recent chat.`);
    }
  } catch (error) {
    console.error('Error handling memory command:', error);
    await sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Send a message to Telegram
 */
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

run().catch(console.error);
