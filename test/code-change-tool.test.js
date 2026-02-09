#!/usr/bin/env node

/**
 * Simple test for code change PR creation tool
 * Run with: node test/code-change-tool.test.js
 */

import fs from 'fs/promises';

async function runTests() {
  console.log('🧪 Testing Code Change PR Integration...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Code change processor exists
  try {
    await fs.access('src/code-change-processor.js');
    const content = await fs.readFile('src/code-change-processor.js', 'utf-8');
    if (!content.includes('claude-sonnet-4-5-20250514')) {
      throw new Error('Claude Sonnet 4.5 model not found in processor');
    }
    console.log('✅ Test 1: Code change processor exists and uses Claude Sonnet 4.5');
    passed++;
  } catch (err) {
    console.error('❌ Test 1: Code change processor -', err.message);
    failed++;
  }
  
  // Test 2: Process code changes workflow exists
  try {
    await fs.access('.github/workflows/process-code-changes.yml');
    const content = await fs.readFile('.github/workflows/process-code-changes.yml', 'utf-8');
    if (!content.includes('agent-code-change')) {
      throw new Error('Label not found in workflow');
    }
    console.log('✅ Test 2: Process code changes workflow exists');
    passed++;
  } catch (err) {
    console.error('❌ Test 2: Workflow file -', err.message);
    failed++;
  }
  
  // Test 3: Notify PR status workflow exists
  try {
    await fs.access('.github/workflows/notify-pr-status.yml');
    const content = await fs.readFile('.github/workflows/notify-pr-status.yml', 'utf-8');
    if (!content.includes('TELEGRAM_BOT_TOKEN')) {
      throw new Error('Telegram notification not configured');
    }
    console.log('✅ Test 3: PR notification workflow exists');
    passed++;
  } catch (err) {
    console.error('❌ Test 3: Notification workflow -', err.message);
    failed++;
  }
  
  // Test 4: Claude Sonnet 4.5 model is configured
  try {
    const modelsContent = await fs.readFile('config/models.json', 'utf-8');
    const models = JSON.parse(modelsContent);
    
    if (!models.providers.anthropic.models['claude-sonnet-4-5-20250514']) {
      throw new Error('Claude Sonnet 4.5 model not configured');
    }
    
    console.log('✅ Test 4: Claude Sonnet 4.5 is configured in models.json');
    console.log('   Model:', 'claude-sonnet-4-5-20250514');
    console.log('   Max tokens:', models.providers.anthropic.models['claude-sonnet-4-5-20250514'].max_tokens);
    passed++;
  } catch (err) {
    console.error('❌ Test 4: Model configuration -', err.message);
    failed++;
  }
  
  // Test 5: Agent.js contains the new tool
  try {
    const agentContent = await fs.readFile('src/agent.js', 'utf-8');
    if (!agentContent.includes('create_code_change_pr')) {
      throw new Error('create_code_change_pr tool not found in agent.js');
    }
    if (!agentContent.includes('handleToolCreateCodeChangePR')) {
      throw new Error('Handler function not found in agent.js');
    }
    console.log('✅ Test 5: Agent.js contains code change PR tool');
    passed++;
  } catch (err) {
    console.error('❌ Test 5: Agent.js integration -', err.message);
    failed++;
  }
  
  // Test 6: GitHub service supports PR creation
  try {
    const githubContent = await fs.readFile('src/github-service.js', 'utf-8');
    if (!githubContent.includes('createPullRequest')) {
      throw new Error('createPullRequest method not found');
    }
    console.log('✅ Test 6: GitHub service supports PR creation');
    passed++;
  } catch (err) {
    console.error('❌ Test 6: GitHub service -', err.message);
    failed++;
  }
  
  // Test 7: Documentation updated
  try {
    const soulContent = await fs.readFile('agents/primary/soul.md', 'utf-8');
    if (!soulContent.includes('code changes using Claude Sonnet 4.5') && 
        !soulContent.includes('code modifications')) {
      throw new Error('Soul.md not updated with new capability');
    }
    console.log('✅ Test 7: Documentation updated in soul.md');
    passed++;
  } catch (err) {
    console.error('❌ Test 7: Documentation -', err.message);
    failed++;
  }
  
  // Test 8: README updated
  try {
    const readmeContent = await fs.readFile('README.md', 'utf-8');
    if (!readmeContent.includes('Automated Code Changes') &&
        !readmeContent.includes('Claude Sonnet 4.5')) {
      throw new Error('README not updated with new feature');
    }
    console.log('✅ Test 8: README.md updated with new feature');
    passed++;
  } catch (err) {
    console.error('❌ Test 8: README update -', err.message);
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Tests completed: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(50));
  
  if (passed === 8) {
    console.log('\n🎉 All tests passed! The integration is complete.');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
