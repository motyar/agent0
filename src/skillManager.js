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
   * @returns {Promise<boolean>} - Success status
   */
  async installSkill(ownerRepo) {
    try {
      // Validate ownerRepo format to prevent command injection
      if (!ownerRepo || typeof ownerRepo !== 'string') {
        throw new Error('Invalid ownerRepo: must be a string');
      }
      
      // Validate format: owner/repo (alphanumeric, hyphens, underscores)
      const validPattern = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
      if (!validPattern.test(ownerRepo)) {
        throw new Error('Invalid ownerRepo format: must be "owner/repo" with alphanumeric characters, hyphens, or underscores only');
      }
      
      console.log(`📦 Installing skill: ${ownerRepo}...`);
      
      // Prepare environment with GH_TOKEN for authentication
      // The skills CLI and gh may expect GH_TOKEN instead of GITHUB_TOKEN
      const env = { ...process.env };
      if (process.env.GITHUB_TOKEN && !env.GH_TOKEN) {
        env.GH_TOKEN = process.env.GITHUB_TOKEN;
      }
      
      // Use npx skills CLI with non-interactive flags
      // -y flag for npx to auto-install without prompts
      // --yes flag for skills CLI to avoid interactive prompts
      // Note: Input is validated above, but for enhanced security in future versions,
      // consider using execFile or spawn with array arguments instead of shell string
      execSync(`npx -y skills add ${ownerRepo} --yes`, { 
        cwd: process.cwd(),
        stdio: 'inherit',
        env
      });
      
      console.log(`✓ Installed skill: ${ownerRepo}`);
      return true;
    } catch (error) {
      console.error(`Failed to install skill ${ownerRepo}:`, error.message);
      return false;
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
