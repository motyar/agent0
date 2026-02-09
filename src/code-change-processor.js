#!/usr/bin/env node

/**
 * Code Change Processor
 * 
 * This script processes code change requests using Claude Sonnet 4.5
 * and implements the changes in the current PR branch.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

class CodeChangeProcessor {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.taskDescription = process.env.TASK_DESCRIPTION || '';
    this.prNumber = process.env.PR_NUMBER || '';
    this.prBranch = process.env.PR_BRANCH || '';
    
    if (!this.taskDescription) {
      throw new Error('TASK_DESCRIPTION environment variable is required');
    }
  }

  /**
   * Get the repository structure
   */
  async getRepoStructure() {
    try {
      const { stdout } = await exec('find . -type f -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" | grep -v node_modules | grep -v .git | head -100');
      return stdout.trim();
    } catch (error) {
      console.error('Error getting repo structure:', error);
      return '';
    }
  }

  /**
   * Get content of relevant files
   */
  async getFileContents(filePaths) {
    const contents = {};
    
    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        contents[filePath] = content;
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message);
      }
    }
    
    return contents;
  }

  /**
   * Analyze the task and determine what files need to be changed
   */
  async analyzeTask() {
    console.log('🔍 Analyzing task with Claude Sonnet 4.5...');
    
    const repoStructure = await this.getRepoStructure();
    
    const analysisPrompt = `You are an expert software engineer analyzing a code change request for a GitHub repository.

Repository Structure:
${repoStructure}

Task Description:
${this.taskDescription}

Based on this task, please:
1. Identify which files need to be modified or created
2. Explain what changes need to be made
3. Consider dependencies and side effects

Respond in JSON format:
{
  "analysis": "Brief analysis of what needs to be done",
  "files_to_examine": ["file1.js", "file2.js"],
  "estimated_changes": "Description of expected changes"
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: analysisPrompt
        }
      ]
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    // Extract JSON from response (may be wrapped in markdown code blocks)
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    
    return JSON.parse(jsonText.trim());
  }

  /**
   * Generate the actual code changes
   */
  async generateChanges(analysis) {
    console.log('💡 Generating code changes with Claude Sonnet 4.5...');
    
    // Get contents of files that need to be examined
    const fileContents = await this.getFileContents(analysis.files_to_examine || []);
    
    let filesContext = '';
    for (const [filePath, content] of Object.entries(fileContents)) {
      filesContext += `\n\n=== ${filePath} ===\n${content}`;
    }
    
    const changePrompt = `You are an expert software engineer implementing a code change request.

Task Description:
${this.taskDescription}

Analysis:
${analysis.analysis}

Current File Contents:${filesContext}

Please implement the required changes. For each file that needs to be modified or created, provide:
1. The complete new content of the file
2. A brief explanation of what was changed

Respond in JSON format:
{
  "changes": [
    {
      "file": "path/to/file.js",
      "action": "modify" or "create",
      "content": "complete file content",
      "explanation": "what was changed"
    }
  ],
  "summary": "Overall summary of changes made"
}

Important:
- Provide COMPLETE file contents, not diffs
- Maintain code style and conventions
- Add comments where appropriate
- Ensure changes are minimal and focused
- Follow best practices`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: changePrompt
        }
      ]
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    // Extract JSON from response
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    
    return JSON.parse(jsonText.trim());
  }

  /**
   * Apply the changes to the filesystem
   */
  async applyChanges(changes) {
    console.log('✍️ Applying changes to filesystem...');
    
    for (const change of changes.changes) {
      const filePath = change.file;
      const fileDir = path.dirname(filePath);
      
      // Create directory if it doesn't exist
      await fs.mkdir(fileDir, { recursive: true });
      
      // Write file content
      await fs.writeFile(filePath, change.content, 'utf-8');
      
      console.log(`  ✅ ${change.action === 'create' ? 'Created' : 'Modified'}: ${filePath}`);
    }
    
    console.log(`\n📝 Summary: ${changes.summary}`);
  }

  /**
   * Main processing function
   */
  async process() {
    try {
      console.log('🤖 Starting code change processing...');
      console.log(`📋 Task: ${this.taskDescription}`);
      console.log(`🔀 PR: #${this.prNumber}`);
      console.log(`🌿 Branch: ${this.prBranch}`);
      console.log('');
      
      // Step 1: Analyze the task
      const analysis = await this.analyzeTask();
      console.log(`\n📊 Analysis: ${analysis.analysis}`);
      console.log(`📁 Files to examine: ${analysis.files_to_examine?.join(', ') || 'none'}`);
      
      // Step 2: Generate changes
      const changes = await this.generateChanges(analysis);
      console.log(`\n🔨 Generated ${changes.changes.length} file change(s)`);
      
      // Step 3: Apply changes
      await this.applyChanges(changes);
      
      console.log('\n✅ Code change processing complete!');
      
    } catch (error) {
      console.error('❌ Error processing code changes:', error);
      throw error;
    }
  }
}

// Run the processor
const processor = new CodeChangeProcessor();
processor.process().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
