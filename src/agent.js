#!/usr/bin/env node

import OpenAI from 'openai';
import fs from 'fs/promises';
import TelegramService from './telegram.js';
import MemoryEngine from './memory-engine.js';

class Agent0 {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.telegram = new TelegramService();
    this.memory = new MemoryEngine();

    this.identity = null;
    this.soul = null;
  }

  async initialize() {
    console.log('🤖 Agent0 initializing...');

    // Load identity
    const identityData = await fs.readFile('agents/primary/identity.json', 'utf-8');
    this.identity = JSON.parse(identityData);

    // Load soul
    this.soul = await fs.readFile('agents/primary/soul.md', 'utf-8');

    console.log(`✅ Agent0 v${this.identity.version} ready`);
    console.log(`📖 Soul loaded (${this.soul.length} characters)`);
  }

  async think(message, conversationContext) {
    const prompt = `You are Agent0, an autonomous AI agent running on GitHub Actions.

**YOUR SOUL:**
${this.soul}

**CONVERSATION HISTORY:**
${conversationContext || 'No previous conversation'}

**CURRENT MESSAGE:**
User: ${message.text}

**INSTRUCTIONS:**
- Respond naturally and helpfully
- Remember you respond every 5 minutes (not in real-time)
- Be honest about your limitations
- Keep responses concise (under 300 words)
- Use your memory of past conversations

Respond now:`;

    console.log('🧠 Thinking...');

    // Ensure we have model and max_tokens in identity
    const modelName = (this.identity && this.identity.model && this.identity.model.name) || 'gpt-4o-mini';
    const maxTokens = (this.identity && this.identity.model && this.identity.model.max_tokens) || 512;

    // Use OpenAI Responses API
    const response = await this.openai.responses.create({
      model: modelName,
      input: prompt,
      max_tokens: maxTokens
    });

    // Extract text from response (robust for common response shapes)
    let responseText = '';
    if (response.output_text) {
      responseText = response.output_text;
    } else if (response.output && Array.isArray(response.output)) {
      for (const out of response.output) {
        if (out.content && Array.isArray(out.content)) {
          for (const c of out.content) {
            if (typeof c === 'string') {
              responseText += c;
            } else if (c.type === 'output_text' && c.text) {
              responseText += c.text;
            } else if (c.text) {
              responseText += c.text;
            }
          }
        } else if (out.text) {
          responseText += out.text;
        }
      }
    } else if (response.output && response.output[0] && response.output[0].text) {
      responseText = response.output[0].text;
    } else {
      // fallback
      responseText = JSON.stringify(response);
    }

    console.log(`💭 Generated response (${responseText.length} chars)`);

    return responseText;
  }

  // ... other methods remain unchanged (process, processMessage, updateStats, etc.)
}

// CLI
const command = process.argv[2];

if (command === 'process') {
  const agent = new Agent0();
  agent.process().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
} else {
  console.log('Usage: node agent.js process');
  process.exit(1);
}

export default Agent0;
