#!/usr/bin/env node

/**
 * GitHub Service - Handle GitHub operations including PR creation
 */
class GitHubService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    
    if (!this.token) {
      console.warn('GITHUB_TOKEN not set - GitHub operations will be limited');
    }

    // Extract owner and repo from git remote or environment
    this.owner = process.env.GITHUB_REPOSITORY_OWNER || 'motyar';
    this.repo = process.env.GITHUB_REPOSITORY_NAME || 'agent0';
    
    // If GITHUB_REPOSITORY is set (format: owner/repo), parse it
    if (process.env.GITHUB_REPOSITORY) {
      const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
      this.owner = owner;
      this.repo = repo;
    }
  }

  /**
   * Make a GitHub API request
   */
  async api(endpoint, method = 'GET', body = null) {
    if (!this.token) {
      throw new Error('GITHUB_TOKEN is required for GitHub API operations');
    }

    const url = `https://api.github.com${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${this.token}`,
        'User-Agent': 'Agent0-Bot',
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.debug(`GitHub API ${method} ${endpoint}`);

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${errorText}`);
    }

    if (response.status === 204) {
      return null; // No content
    }

    return await response.json();
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName, baseBranch = 'main') {
    console.log(`Creating branch: ${branchName} from ${baseBranch}`);

    // Get the SHA of the base branch
    const baseRef = await this.api(`/repos/${this.owner}/${this.repo}/git/ref/heads/${baseBranch}`);
    const baseSha = baseRef.object.sha;

    // Create the new branch
    const newRef = await this.api(`/repos/${this.owner}/${this.repo}/git/refs`, 'POST', {
      ref: `refs/heads/${branchName}`,
      sha: baseSha
    });

    console.log(`Branch created: ${branchName}`);
    return newRef;
  }

  /**
   * Create a pull request
   */
  async createPullRequest({ title, body, head, base = 'main' }) {
    console.log(`Creating PR: ${title}`);

    const pr = await this.api(`/repos/${this.owner}/${this.repo}/pulls`, 'POST', {
      title,
      body,
      head,
      base
    });

    console.log(`PR created: #${pr.number} - ${pr.html_url}`);
    return pr;
  }

  /**
   * Create an initial commit on a branch
   * This ensures the branch has at least one commit different from base
   */
  async createInitialCommit(branchName, taskDescription) {
    console.log(`Creating initial commit on branch: ${branchName}`);

    // Get the current commit SHA of the branch
    const branchRef = await this.api(`/repos/${this.owner}/${this.repo}/git/ref/heads/${branchName}`);
    const branchSha = branchRef.object.sha;

    // Get the tree for the current commit
    const commit = await this.api(`/repos/${this.owner}/${this.repo}/git/commits/${branchSha}`);
    const baseTreeSha = commit.tree.sha;

    // Sanitize task description to prevent any issues
    const sanitizedDescription = taskDescription
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim();

    // Create a new blob for the task metadata file
    const timestamp = new Date().toISOString();
    const taskMetadata = `# Task Request

**Description:** ${sanitizedDescription}
**Created:** ${timestamp}
**Status:** Pending

This file was automatically created by Agent0 to initialize the task branch.
GitHub requires at least one commit difference to create a pull request.
`;

    const blob = await this.api(`/repos/${this.owner}/${this.repo}/git/blobs`, 'POST', {
      content: Buffer.from(taskMetadata).toString('base64'),
      encoding: 'base64'
    });

    // Create a new tree with the task metadata file
    const tree = await this.api(`/repos/${this.owner}/${this.repo}/git/trees`, 'POST', {
      base_tree: baseTreeSha,
      tree: [{
        path: '.tasks/TASK_METADATA.md',
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      }]
    });

    // Create a new commit
    const newCommit = await this.api(`/repos/${this.owner}/${this.repo}/git/commits`, 'POST', {
      message: `Initialize task branch\n\n${sanitizedDescription}`,
      tree: tree.sha,
      parents: [branchSha]
    });

    // Update the branch reference to point to the new commit
    await this.api(`/repos/${this.owner}/${this.repo}/git/refs/heads/${branchName}`, 'PATCH', {
      sha: newCommit.sha,
      force: false
    });

    console.log(`Initial commit created on branch: ${branchName}`);
    return newCommit;
  }

  /**
   * Add labels to a pull request
   */
  async addLabels(prNumber, labels) {
    console.log(`Adding labels to PR #${prNumber}: ${labels.join(', ')}`);

    await this.api(`/repos/${this.owner}/${this.repo}/issues/${prNumber}/labels`, 'POST', {
      labels
    });
  }

  /**
   * Create a pull request for a task requested by bot
   * This creates a branch and PR suitable for Copilot agent execution
   */
  async createTaskPR({ taskDescription, requestedBy, userId }) {
    // Generate branch name
    const timestamp = Date.now();
    const sanitizedTask = taskDescription
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50)
      .replace(/^-|-$/g, '');
    
    const branchName = `bot-task/${sanitizedTask}-${timestamp}`;

    try {
      // Create branch
      await this.createBranch(branchName);

      // Create initial commit on the branch to ensure there's a difference from main
      await this.createInitialCommit(branchName, taskDescription);

      // Create PR with detailed description for Copilot
      const prTitle = `Bot Task: ${taskDescription}`;
      const prBody = `## Task Request from Bot

**Requested by:** @${requestedBy} (User ID: ${userId})
**Task:** ${taskDescription}

### Instructions for Copilot Agent

${taskDescription}

### Context

This PR was automatically created by Agent0 based on a user request via Telegram bot.
The task should be implemented following the repository's conventions and best practices.

---
🤖 Created by Agent0 Bot
`;

      // Create PR
      const pr = await this.createPullRequest({
        title: prTitle,
        body: prBody,
        head: branchName,
        base: 'main'
      });

      // Add labels
      await this.addLabels(pr.number, ['bot-task', 'copilot']);

      return {
        success: true,
        pr_number: pr.number,
        pr_url: pr.html_url,
        branch: branchName
      };

    } catch (error) {
      console.error(`Failed to create task PR: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if GitHub token is available
   */
  isAvailable() {
    return !!this.token;
  }
}

export default GitHubService;
