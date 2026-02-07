// Skill Manager for Agent0 - Skills.sh Integration
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

class SkillManager {
  constructor(skillsDir = './skills') {
    this.skillsDir = skillsDir;
  }

  /**
   * Install a skill from Skills.sh using npx skills CLI
   * @param {string} ownerRepo - Repository in format "owner/repo"
   * @returns {Promise<Object>} - Result object with success status and detailed message
   */
  async installSkill(ownerRepo) {
    try {
      // Validate ownerRepo format to prevent command injection
      if (!ownerRepo || typeof ownerRepo !== 'string') {
        return {
          success: false,
          error: 'INVALID_INPUT',
          message: 'Invalid repository format: must be a non-empty string'
        };
      }
      
      // Validate format: owner/repo (alphanumeric, hyphens, underscores)
      const validPattern = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
      if (!validPattern.test(ownerRepo)) {
        return {
          success: false,
          error: 'INVALID_FORMAT',
          message: 'Invalid repository format: must be "owner/repo" with alphanumeric characters, hyphens, or underscores only'
        };
      }
      
      // Check if repository exists on GitHub before attempting installation
      const validationResult = await this.validateGitHubRepository(ownerRepo);
      if (validationResult === false) {
        return {
          success: false,
          error: 'REPOSITORY_NOT_FOUND',
          message: `Repository "${ownerRepo}" does not exist or is not accessible on GitHub`
        };
      }
      // If validationResult is true or null (couldn't validate), proceed with installation
      
      console.log(`📦 Installing skill: ${ownerRepo}...`);
      
      // Use npx skills CLI
      // Note: Input is validated above, but for enhanced security in future versions,
      // consider using execFile or spawn with array arguments instead of shell string
      execSync(`npx skills add ${ownerRepo}`, { 
        cwd: process.cwd(),
        stdio: 'inherit' 
      });
      
      console.log(`✓ Installed skill: ${ownerRepo}`);
      return {
        success: true,
        message: `Successfully installed skill: ${ownerRepo}`
      };
    } catch (error) {
      console.error(`Failed to install skill ${ownerRepo}:`, error.message);
      
      // Determine specific error type based on error characteristics
      const errorMsg = error.message?.toLowerCase() || '';
      const errorCode = error.code?.toLowerCase() || '';
      
      if (errorMsg.includes('not found') || errorMsg.includes('404') || errorCode === 'enoent') {
        return {
          success: false,
          error: 'REPOSITORY_NOT_FOUND',
          message: `Repository "${ownerRepo}" not found or not accessible`
        };
      } else if (errorMsg.includes('permission') || errorMsg.includes('403') || errorCode === 'eacces') {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: `Permission denied accessing repository "${ownerRepo}"`
        };
      } else if (errorMsg.includes('network') || errorMsg.includes('enotfound') || 
                 errorMsg.includes('etimedout') || errorCode === 'enotfound' || errorCode === 'etimedout') {
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: 'Network error: Unable to connect to GitHub or Skills.sh'
        };
      }
      
      return {
        success: false,
        error: 'INSTALLATION_FAILED',
        message: `Failed to install skill: ${error.message}`
      };
    }
  }

  /**
   * Validate that a GitHub repository exists and is accessible
   * @param {string} ownerRepo - Repository in format "owner/repo"
   * @returns {Promise<boolean|null>} - True if repository exists, false if not found, null if validation couldn't be performed
   */
  async validateGitHubRepository(ownerRepo) {
    try {
      const [owner, repo] = ownerRepo.split('/');
      
      // Use GitHub API to check if repository exists
      // This uses the public API which doesn't require authentication for public repos
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Agent0-SkillManager'
        }
      });
      
      if (response.status === 200) {
        return true;
      } else if (response.status === 404) {
        console.log(`Repository ${ownerRepo} not found on GitHub`);
        return false;
      } else if (response.status === 403) {
        // Rate limited or forbidden - we can't verify so return null
        console.warn(`GitHub API rate limit or forbidden for ${ownerRepo}, skipping validation`);
        return null;
      }
      
      // For other status codes, return null to indicate validation couldn't be completed
      console.warn(`Unexpected GitHub API response ${response.status} for ${ownerRepo}, skipping validation`);
      return null;
    } catch (error) {
      // Network errors or other issues - return null to indicate validation couldn't be completed
      console.warn(`Could not validate repository ${ownerRepo}:`, error.message);
      return null;
    }
  }

  /**
   * Load all SKILL.md files from the skills directory
   * @returns {Promise<Array>} - Array of skill objects with name and content
   */
  async loadSkills() {
    const skills = [];
    
    try {
      // Check if skills directory exists
      await fs.access(this.skillsDir);
      
      // Read all subdirectories (managed, workspace)
      const subdirs = ['managed', 'workspace'];
      
      for (const subdir of subdirs) {
        const subdirPath = path.join(this.skillsDir, subdir);
        
        try {
          const files = await fs.readdir(subdirPath);
          
          for (const file of files) {
            if (file.endsWith('.md')) {
              const filePath = path.join(subdirPath, file);
              const content = await fs.readFile(filePath, 'utf-8');
              
              skills.push({
                name: file,
                type: subdir,
                path: filePath,
                content: content
              });
            }
          }
        } catch (error) {
          // Subdirectory might not exist yet
          console.log(`⚠️  Skipping ${subdir} directory: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`Error loading skills:`, error.message);
    }
    
    return skills;
  }

  /**
   * Parse SKILL.md format to extract metadata and instructions
   * @param {string} content - Raw SKILL.md content
   * @returns {Object} - Parsed skill object with metadata and instructions
   */
  parseSkill(content) {
    const lines = content.split('\n');
    const metadata = {};
    let instructions = '';
    let currentSection = '';
    
    // Extract title and sections
    for (const line of lines) {
      if (line.startsWith('# ')) {
        metadata.title = line.substring(2).trim();
      } else if (line.startsWith('## ')) {
        currentSection = line.substring(3).trim();
      }
      
      // Build instructions from entire content
      instructions += line + '\n';
    }
    
    return {
      metadata,
      instructions: instructions.trim(),
      rawContent: content
    };
  }

  /**
   * List all installed skills (SKILL.md files)
   * @returns {Promise<Array>} - Array of skill names
   */
  async listSkills() {
    const skills = await this.loadSkills();
    return skills.map(s => ({
      name: s.name,
      type: s.type,
      path: s.path
    }));
  }

  /**
   * Remove a skill by filename
   * @param {string} skillName - Name of the skill file (e.g., "skill.md")
   * @returns {Promise<boolean>} - Success status
   */
  async removeSkill(skillName) {
    try {
      // Search for the skill in managed and workspace directories
      const subdirs = ['managed', 'workspace'];
      
      for (const subdir of subdirs) {
        const skillPath = path.join(this.skillsDir, subdir, skillName);
        
        try {
          await fs.access(skillPath);
          await fs.unlink(skillPath);
          console.log(`✓ Removed skill: ${skillName} from ${subdir}`);
          return true;
        } catch (error) {
          // Skill not in this directory, try next
          continue;
        }
      }
      
      // If we get here, skill was not found in any directory
      throw new Error(`Skill ${skillName} not found`);
      
    } catch (error) {
      console.error(`Failed to remove skill ${skillName}:`, error.message);
      return false;
    }
  }

  /**
   * Get skills context for injection into agent prompts
   * @returns {Promise<string>} - Formatted skills context
   */
  async getSkillsContext() {
    const skills = await this.loadSkills();
    
    if (skills.length === 0) {
      return '';
    }
    
    const skillsContent = skills.map(skill => {
      const parsed = this.parseSkill(skill.content);
      return `### ${parsed.metadata.title || skill.name}\n${parsed.instructions}`;
    }).join('\n\n---\n\n');
    
    return skillsContent;
  }

  /**
   * Ensure skill directories exist
   */
  async ensureDirectories() {
    const dirs = [
      path.join(this.skillsDir, 'managed'),
      path.join(this.skillsDir, 'workspace')
    ];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`✓ Ensured directory: ${dir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          console.error(`⚠️  Failed to create directory ${dir}:`, error.message);
        }
      }
    }
  }
}

export default SkillManager;
