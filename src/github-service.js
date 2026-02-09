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
   * Create an issue and assign it to Copilot for processing
   * This is the correct way to trigger GitHub Copilot agent
   */
  async createTaskIssue({ taskDescription, requestedBy, userId }) {
    try {
      // Create issue with detailed description for Copilot
      const issueTitle = `Bot Task: ${taskDescription}`;
      const issueBody = `## Task Request from Bot

**Requested by:** @${requestedBy} (User ID: ${userId})

### Task Description

${taskDescription}

### Instructions

Please implement the requested changes following the repository's conventions and best practices.

### Context

This issue was automatically created by Agent0 based on a user request via Telegram bot.
The Copilot agent will process this task and create a pull request with the implementation.

---
🤖 Created by Agent0 Bot
`;

      // Create the issue
      const issue = await this.api(`/repos/${this.owner}/${this.repo}/issues`, 'POST', {
        title: issueTitle,
        body: issueBody,
        labels: ['bot-task', 'copilot-agent']
      });

      console.log(`Issue created: #${issue.number} - ${issue.html_url}`);

      // Assign the issue to Copilot agent
      // Note: The assignee should be 'copilot' or the configured Copilot username
      try {
        await this.api(`/repos/${this.owner}/${this.repo}/issues/${issue.number}`, 'PATCH', {
          assignees: ['copilot']
        });
        console.log(`Issue #${issue.number} assigned to Copilot agent`);
      } catch (assignError) {
        console.warn(`Could not assign to Copilot: ${assignError.message}`);
        console.log('The issue was created but not assigned. You may need to manually assign it to @copilot.');
      }

      return {
        success: true,
        issue_number: issue.number,
        issue_url: issue.html_url
      };

    } catch (error) {
      console.error(`Failed to create task issue: ${error.message}`);
      throw error;
    }
  }

  /**
   * @deprecated Use createTaskIssue instead
   * Create a pull request for a task requested by bot
   * This creates a branch and PR suitable for Copilot agent execution
   */
  async createTaskPR({ taskDescription, requestedBy, userId }) {
    // Redirect to the new method
    console.warn('createTaskPR is deprecated. Use createTaskIssue instead.');
    return await this.createTaskIssue({ taskDescription, requestedBy, userId });
  }

  /**
   * Check if GitHub token is available
   */
  isAvailable() {
    return !!this.token;
  }
}

export default GitHubService;
