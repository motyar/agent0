const fs = require('fs/promises');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const STATE_FILE = 'queue/last_id.json';

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
  const updates = await response.json();

  if (!updates.ok || !updates.result || updates.result.length === 0) {
    console.log("No new messages.");
    return;
  }

  for (const update of updates.result) {
    const chatId = update.message?.chat?.id;
    const text = update.message?.text;

    if (chatId && text) {
      console.log(`Processing message from ${chatId}: ${text}`);

      // 3. Get AI Response
      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: text }]
          })
        });
        const aiData = await aiResponse.json();
        const replyText = aiData.choices[0].message.content;

        // 4. Send Reply
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: replyText })
        });
      } catch (error) {
        console.error("Error processing AI response or sending message:", error);
      }
    }

    lastId = update.update_id;
  }

  // 5. Save state
  await fs.mkdir('queue', { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify({ last_update_id: lastId }));
}

run().catch(console.error);
