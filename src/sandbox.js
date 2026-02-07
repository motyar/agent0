import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

/**
 * Docker-based code execution sandbox
 * Provides isolated environment for running untrusted code
 */
class Sandbox {
  constructor(options = {}) {
    this.image = options.image || 'node:22-alpine';
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.maxMemory = options.maxMemory || '128m';
    this.maxCpu = options.maxCpu || '0.5';
    this.workDir = options.workDir || '/tmp/sandbox';
  }

  /**
   * Check if Docker is available
   */
  async isAvailable() {
    return new Promise((resolve) => {
      const docker = spawn('docker', ['--version']);
      
      docker.on('close', (code) => {
        resolve(code === 0);
      });

      docker.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Execute code in an isolated Docker container
   */
  async executeCode(code, language = 'javascript', options = {}) {
    // Check Docker availability
    const dockerAvailable = await this.isAvailable();
    if (!dockerAvailable) {
      throw new Error('Docker is not available. Install Docker to use sandbox mode.');
    }

    // Generate unique container name
    const containerId = `sandbox-${randomBytes(8).toString('hex')}`;
    const timeout = options.timeout || this.timeout;

    try {
      // Prepare code file
      const { filename, imageName } = this.getLanguageConfig(language);
      const codeFile = path.join('/tmp', `${containerId}-${filename}`);
      await fs.writeFile(codeFile, code);

      // Build Docker command
      const dockerArgs = [
        'run',
        '--rm',
        '--name', containerId,
        '--memory', options.maxMemory || this.maxMemory,
        '--cpus', options.maxCpu || this.maxCpu,
        '--network', 'none', // No network access
        '--read-only', // Read-only file system
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=10m', // Small writable tmp
        '-v', `${codeFile}:${this.workDir}/${filename}:ro`,
        '-w', this.workDir,
        imageName,
        ...this.getRunCommand(language, filename)
      ];

      // Execute with timeout
      const result = await this.runWithTimeout(dockerArgs, timeout);

      // Cleanup
      await fs.unlink(codeFile).catch(() => {});

      return {
        success: true,
        output: result.stdout,
        error: result.stderr,
        exitCode: result.exitCode,
        executionTime: result.executionTime
      };

    } catch (error) {
      // Cleanup on error
      try {
        await this.stopContainer(containerId);
      } catch {}

      return {
        success: false,
        output: '',
        error: error.message,
        exitCode: -1,
        executionTime: 0
      };
    }
  }

  /**
   * Get language-specific configuration
   */
  getLanguageConfig(language) {
    const configs = {
      javascript: {
        filename: 'script.js',
        imageName: 'node:22-alpine'
      },
      python: {
        filename: 'script.py',
        imageName: 'python:3.12-alpine'
      },
      bash: {
        filename: 'script.sh',
        imageName: 'alpine:latest'
      }
    };

    return configs[language] || configs.javascript;
  }

  /**
   * Get run command for specific language
   */
  getRunCommand(language, filename) {
    const commands = {
      javascript: ['node', filename],
      python: ['python', filename],
      bash: ['sh', filename]
    };

    return commands[language] || commands.javascript;
  }

  /**
   * Run Docker command with timeout
   */
  runWithTimeout(dockerArgs, timeout) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let killed = false;

      const process = spawn('docker', dockerArgs);

      // Capture output
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle timeout
      const timer = setTimeout(() => {
        killed = true;
        process.kill('SIGTERM');
        
        // Force kill if not stopped after 2 seconds
        setTimeout(() => {
          process.kill('SIGKILL');
        }, 2000);
      }, timeout);

      // Handle completion
      process.on('close', (code) => {
        clearTimeout(timer);
        const executionTime = Date.now() - startTime;

        if (killed) {
          reject(new Error(`Execution timeout after ${timeout}ms`));
        } else {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code,
            executionTime
          });
        }
      });

      // Handle errors
      process.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Stop a running container
   */
  async stopContainer(containerId) {
    return new Promise((resolve) => {
      const process = spawn('docker', ['stop', containerId]);
      process.on('close', () => resolve());
      process.on('error', () => resolve());
    });
  }

  /**
   * List common libraries available in sandbox
   */
  getAvailableLibraries(language = 'javascript') {
    const libraries = {
      javascript: [
        'Built-in Node.js modules (fs, path, crypto, etc.)',
        'Limited npm packages (none by default for security)'
      ],
      python: [
        'Python standard library',
        'No pip packages by default'
      ],
      bash: [
        'Standard Unix utilities',
        'Alpine Linux core tools'
      ]
    };

    return libraries[language] || [];
  }

  /**
   * Validate code before execution (basic checks)
   */
  validateCode(code, language = 'javascript') {
    // Check code length
    if (code.length > 50000) {
      return {
        valid: false,
        error: 'Code exceeds maximum length (50KB)'
      };
    }

    // Language-specific validation
    if (language === 'javascript') {
      // Check for dangerous patterns
      const dangerousPatterns = [
        /require\s*\(\s*['"]child_process['"]\s*\)/,
        /require\s*\(\s*['"]net['"]\s*\)/,
        /require\s*\(\s*['"]http['"]\s*\)/,
        /eval\s*\(/,
        /Function\s*\(/
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          return {
            valid: false,
            error: 'Code contains potentially dangerous operations'
          };
        }
      }
    }

    return { valid: true };
  }
}

export default Sandbox;
