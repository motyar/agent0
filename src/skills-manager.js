import fs from 'fs/promises';
import path from 'path';

/**
 * Skills Platform - Manage bundled, managed, and workspace skills
 */
class SkillsManager {
  constructor() {
    this.skills = new Map();
    this.bundledSkillsPath = 'skills/bundled';
    this.managedSkillsPath = 'skills/managed';
    this.workspaceSkillsPath = 'skills/workspace';
  }

  /**
   * Initialize skills manager and load all skills
   */
  async initialize() {
    console.log('🎯 Initializing skills platform...');
    
    try {
      // Create skill directories if they don't exist
      await this.ensureDirectories();
      
      // Load bundled skills (built-in)
      await this.loadBundledSkills();
      
      // Load managed skills (installed)
      await this.loadManagedSkills();
      
      // Load workspace skills (custom)
      await this.loadWorkspaceSkills();
      
      console.log(`✅ Skills platform initialized with ${this.skills.size} skills`);
    } catch (error) {
      console.error('❌ Failed to initialize skills platform:', error.message);
    }
  }

  /**
   * Ensure skill directories exist
   */
  async ensureDirectories() {
    const dirs = [
      this.bundledSkillsPath,
      this.managedSkillsPath,
      this.workspaceSkillsPath
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true }).catch(() => {});
    }
  }

  /**
   * Load bundled skills
   */
  async loadBundledSkills() {
    console.log('📦 Loading bundled skills...');
    
    try {
      const files = await fs.readdir(this.bundledSkillsPath);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          await this.loadSkill(path.join(this.bundledSkillsPath, file), 'bundled');
        }
      }
    } catch (error) {
      console.log('⚠️  No bundled skills found');
    }
  }

  /**
   * Load managed skills
   */
  async loadManagedSkills() {
    console.log('🔧 Loading managed skills...');
    
    try {
      const files = await fs.readdir(this.managedSkillsPath);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          await this.loadSkill(path.join(this.managedSkillsPath, file), 'managed');
        }
      }
    } catch (error) {
      console.log('⚠️  No managed skills found');
    }
  }

  /**
   * Load workspace skills
   */
  async loadWorkspaceSkills() {
    console.log('💼 Loading workspace skills...');
    
    try {
      const files = await fs.readdir(this.workspaceSkillsPath);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          await this.loadSkill(path.join(this.workspaceSkillsPath, file), 'workspace');
        }
      }
    } catch (error) {
      console.log('⚠️  No workspace skills found');
    }
  }

  /**
   * Load a single skill
   */
  async loadSkill(skillPath, type) {
    try {
      const skill = await import(path.resolve(skillPath));
      const skillData = skill.default || skill;
      
      if (skillData.name && skillData.execute) {
        const skillInfo = {
          name: skillData.name,
          type,
          description: skillData.description || 'No description',
          version: skillData.version || '1.0.0',
          execute: skillData.execute,
          path: skillPath
        };
        
        this.skills.set(skillData.name, skillInfo);
        console.log(`  ✅ Loaded ${type} skill: ${skillData.name}`);
      } else {
        console.warn(`  ⚠️  Invalid skill format: ${skillPath}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to load skill ${skillPath}:`, error.message);
    }
  }

  /**
   * Execute a skill by name
   */
  async executeSkill(skillName, params = {}) {
    const skill = this.skills.get(skillName);
    
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }
    
    console.log(`🎯 Executing skill: ${skillName}`);
    
    try {
      const result = await skill.execute(params);
      console.log(`✅ Skill ${skillName} executed successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Skill ${skillName} execution failed:`, error.message);
      throw error;
    }
  }

  /**
   * List all available skills
   */
  listSkills() {
    const skillsList = [];
    
    for (const [name, skill] of this.skills.entries()) {
      skillsList.push({
        name,
        type: skill.type,
        description: skill.description,
        version: skill.version
      });
    }
    
    return skillsList;
  }

  /**
   * Get skill information
   */
  getSkill(skillName) {
    return this.skills.get(skillName);
  }

  /**
   * Install a managed skill
   */
  async installSkill(skillCode, skillName) {
    console.log(`📥 Installing skill: ${skillName}`);
    
    try {
      const skillPath = path.join(this.managedSkillsPath, `${skillName}.js`);
      await fs.writeFile(skillPath, skillCode);
      
      // Load the new skill
      await this.loadSkill(skillPath, 'managed');
      
      console.log(`✅ Skill ${skillName} installed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to install skill ${skillName}:`, error.message);
      throw error;
    }
  }

  /**
   * Uninstall a skill
   */
  async uninstallSkill(skillName) {
    const skill = this.skills.get(skillName);
    
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }
    
    if (skill.type === 'bundled') {
      throw new Error('Cannot uninstall bundled skills');
    }
    
    console.log(`🗑️  Uninstalling skill: ${skillName}`);
    
    try {
      await fs.unlink(skill.path);
      this.skills.delete(skillName);
      
      console.log(`✅ Skill ${skillName} uninstalled successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to uninstall skill ${skillName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get skills statistics
   */
  getStatistics() {
    const stats = {
      total: this.skills.size,
      bundled: 0,
      managed: 0,
      workspace: 0
    };
    
    for (const skill of this.skills.values()) {
      stats[skill.type]++;
    }
    
    return stats;
  }
}

export default SkillsManager;
