import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Skills Engine - Auto-discovery and execution of skills
 * Replaces SkillsManager with simplified auto-discovery
 */
class SkillsEngine {
  constructor() {
    this.skills = new Map();
    this.skillsBasePath = 'skills';
  }

  /**
   * Initialize skills engine and auto-discover all skills
   */
  async initialize() {
    console.log('🔍 Auto-discovering skills...');
    
    try {
      // Auto-discover skills in all directories
      await this.discoverSkills();
      
      console.log(`✅ Skills engine initialized with ${this.skills.size} skill(s)`);
    } catch (error) {
      console.error('❌ Failed to initialize skills engine:', error.message);
      // Continue without skills - non-fatal
    }
  }

  /**
   * Auto-discover skills in all skill directories
   */
  async discoverSkills() {
    const discoveryPaths = [
      path.join(this.skillsBasePath, 'bundled'),
      path.join(this.skillsBasePath, 'managed'),
      path.join(this.skillsBasePath, 'workspace')
    ];

    for (const discoveryPath of discoveryPaths) {
      try {
        await this.discoverInDirectory(discoveryPath);
      } catch (error) {
        // Directory might not exist - that's OK
        console.log(`⚠️  Skipping ${discoveryPath}: ${error.message}`);
      }
    }
  }

  /**
   * Discover skills in a specific directory
   */
  async discoverInDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.js')) {
          const skillPath = path.join(dirPath, entry.name);
          await this.loadSkill(skillPath);
        }
      }
    } catch (error) {
      throw new Error(`Cannot read directory: ${error.message}`);
    }
  }

  /**
   * Load a single skill from file
   */
  async loadSkill(skillPath) {
    try {
      // Convert to absolute path and file URL for dynamic import
      const absolutePath = path.resolve(skillPath);
      const fileUrl = `file://${absolutePath}`;
      
      const skill = await import(fileUrl);
      const skillData = skill.default || skill;
      
      // Validate skill structure
      if (!this.isValidSkill(skillData)) {
        console.warn(`  ⚠️  Invalid skill format: ${skillPath}`);
        return;
      }
      
      // Determine skill type from path
      const type = this.getSkillType(skillPath);
      
      const skillInfo = {
        name: skillData.name,
        type,
        description: skillData.description || 'No description',
        version: skillData.version || '1.0.0',
        execute: skillData.execute,
        path: skillPath,
        metadata: skillData.metadata || {}
      };
      
      this.skills.set(skillData.name, skillInfo);
      console.log(`  ✅ Loaded ${type} skill: ${skillData.name} v${skillInfo.version}`);
      
    } catch (error) {
      console.error(`  ❌ Failed to load skill ${skillPath}:`, error.message);
    }
  }

  /**
   * Validate skill structure
   */
  isValidSkill(skillData) {
    return skillData &&
           typeof skillData.name === 'string' &&
           typeof skillData.execute === 'function';
  }

  /**
   * Determine skill type from path
   */
  getSkillType(skillPath) {
    if (skillPath.includes('/bundled/')) return 'bundled';
    if (skillPath.includes('/managed/')) return 'managed';
    if (skillPath.includes('/workspace/')) return 'workspace';
    return 'unknown';
  }

  /**
   * Execute a skill by name
   */
  async execute(skillName, params = {}) {
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
  list() {
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
   * Get skill information by name
   */
  get(skillName) {
    return this.skills.get(skillName);
  }

  /**
   * Check if a skill exists
   */
  has(skillName) {
    return this.skills.has(skillName);
  }

  /**
   * Get skills by type
   */
  getByType(type) {
    const filtered = [];
    
    for (const skill of this.skills.values()) {
      if (skill.type === type) {
        filtered.push(skill);
      }
    }
    
    return filtered;
  }

  /**
   * Get skills statistics
   */
  getStatistics() {
    const stats = {
      total: this.skills.size,
      bundled: 0,
      managed: 0,
      workspace: 0,
      unknown: 0
    };
    
    for (const skill of this.skills.values()) {
      const type = skill.type || 'unknown';
      if (stats[type] !== undefined) {
        stats[type]++;
      }
    }
    
    return stats;
  }

  /**
   * Reload all skills (useful for development)
   */
  async reload() {
    console.log('🔄 Reloading all skills...');
    this.skills.clear();
    await this.initialize();
  }
}

export default SkillsEngine;
