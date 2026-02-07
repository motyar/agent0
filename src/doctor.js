#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

/**
 * Doctor Command - Diagnose and fix configuration issues
 */
class Doctor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.checks = [
      this.checkNodeVersion.bind(this),
      this.checkPackageJson.bind(this),
      this.checkDependencies.bind(this),
      this.checkEnvironmentVariables.bind(this),
      this.checkDirectories.bind(this),
      this.checkAgentConfiguration.bind(this),
      this.checkWorkflowFiles.bind(this)
    ];
  }

  /**
   * Run all diagnostic checks
   */
  async diagnose() {
    console.log('🏥 Agent0 Doctor - Running diagnostics...\n');
    
    for (const check of this.checks) {
      try {
        await check();
      } catch (error) {
        this.issues.push(`Check failed: ${error.message}`);
      }
    }
    
    // Print report
    this.printReport();
    
    // Return status
    return {
      healthy: this.issues.length === 0,
      issues: this.issues,
      warnings: this.warnings
    };
  }

  /**
   * Check Node.js version
   */
  async checkNodeVersion() {
    console.log('🔍 Checking Node.js version...');
    
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    
    if (major < 22) {
      this.issues.push(`Node.js version ${version} is not supported. Please use Node.js 22 or higher.`);
    } else {
      console.log(`  ✅ Node.js ${version}`);
    }
  }

  /**
   * Check package.json
   */
  async checkPackageJson() {
    console.log('🔍 Checking package.json...');
    
    try {
      const data = await fs.readFile('package.json', 'utf-8');
      const pkg = JSON.parse(data);
      
      if (!pkg.name || !pkg.version) {
        this.issues.push('package.json is missing name or version');
      } else {
        console.log(`  ✅ Package: ${pkg.name}@${pkg.version}`);
      }
    } catch (error) {
      this.issues.push('package.json not found or invalid');
    }
  }

  /**
   * Check dependencies
   */
  async checkDependencies() {
    console.log('🔍 Checking dependencies...');
    
    try {
      await fs.access('node_modules');
      console.log('  ✅ Dependencies installed');
    } catch (error) {
      this.issues.push('node_modules not found. Run: npm install');
    }
  }

  /**
   * Check environment variables
   */
  async checkEnvironmentVariables() {
    console.log('🔍 Checking environment variables...');
    
    const required = ['OPENAI_API_KEY', 'TELEGRAM_BOT_TOKEN'];
    const missing = [];
    
    for (const envVar of required) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }
    
    if (missing.length > 0) {
      this.warnings.push(`Missing environment variables: ${missing.join(', ')}`);
      console.log(`  ⚠️  Missing: ${missing.join(', ')}`);
    } else {
      console.log('  ✅ All required environment variables set');
    }
  }

  /**
   * Check required directories
   */
  async checkDirectories() {
    console.log('🔍 Checking directories...');
    
    const requiredDirs = [
      'src',
      'agents/primary',
      'memory',
      'queue',
      'skills/bundled',
      'skills/managed',
      'skills/workspace',
      'config'
    ];
    
    const missing = [];
    
    for (const dir of requiredDirs) {
      try {
        await fs.access(dir);
      } catch (error) {
        missing.push(dir);
      }
    }
    
    if (missing.length > 0) {
      this.issues.push(`Missing directories: ${missing.join(', ')}`);
    } else {
      console.log('  ✅ All required directories exist');
    }
  }

  /**
   * Check agent configuration
   */
  async checkAgentConfiguration() {
    console.log('🔍 Checking agent configuration...');
    
    try {
      // Check identity.json
      const identityData = await fs.readFile('agents/primary/identity.json', 'utf-8');
      const identity = JSON.parse(identityData);
      
      if (!identity.name || !identity.version) {
        this.issues.push('agents/primary/identity.json is missing name or version');
      }
      
      // Check soul.md
      await fs.access('agents/primary/soul.md');
      
      console.log('  ✅ Agent configuration valid');
    } catch (error) {
      this.issues.push('Agent configuration files missing or invalid');
    }
  }

  /**
   * Check workflow files
   */
  async checkWorkflowFiles() {
    console.log('🔍 Checking workflow files...');
    
    try {
      await fs.access('.github/workflows');
      console.log('  ✅ Workflow directory exists');
    } catch (error) {
      this.warnings.push('.github/workflows directory not found');
    }
  }

  /**
   * Print diagnostic report
   */
  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 DIAGNOSTIC REPORT');
    console.log('='.repeat(60));
    
    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All checks passed! Agent0 is healthy.\n');
    } else {
      if (this.issues.length > 0) {
        console.log('\n❌ ISSUES FOUND:');
        this.issues.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue}`);
        });
      }
      
      if (this.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        this.warnings.forEach((warning, i) => {
          console.log(`  ${i + 1}. ${warning}`);
        });
      }
      
      console.log('\n💡 Run "npm run fix" to attempt automatic fixes.\n');
    }
  }

  /**
   * Attempt to fix common issues
   */
  async fix() {
    console.log('🔧 Attempting to fix issues...\n');
    
    // Create missing directories
    const requiredDirs = [
      'src',
      'agents/primary',
      'memory',
      'queue',
      'skills/bundled',
      'skills/managed',
      'skills/workspace',
      'config'
    ];
    
    for (const dir of requiredDirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      } catch (error) {
        console.error(`❌ Failed to create ${dir}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Fix complete. Run "npm run doctor" to verify.\n');
  }
}

// CLI
const command = process.argv[2];

const doctor = new Doctor();

if (command === 'fix') {
  doctor.fix().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
} else {
  doctor.diagnose().then(result => {
    if (!result.healthy) {
      process.exit(1);
    }
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export default Doctor;
