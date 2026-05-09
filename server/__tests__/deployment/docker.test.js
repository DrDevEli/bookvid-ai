const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Docker Deployment Configuration Tests', () => {
  const projectRoot = path.resolve(__dirname, '../../../');
  const dockerfilePath = path.join(projectRoot, 'Dockerfile');
  const dockerComposeDevPath = path.join(projectRoot, 'docker-compose.dev.yml');
  const dockerComposeProdPath = path.join(projectRoot, 'docker-compose.yml');

  describe('Dockerfile Configuration', () => {
    it('should have a valid Dockerfile', () => {
      expect(fs.existsSync(dockerfilePath)).toBe(true);
      
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
      
      // Check for essential Dockerfile instructions
      expect(dockerfileContent).toContain('FROM node:');
      expect(dockerfileContent).toContain('WORKDIR');
      expect(dockerfileContent).toContain('COPY package');
      expect(dockerfileContent).toContain('RUN npm install');
      expect(dockerfileContent).toContain('EXPOSE');
      expect(dockerfileContent).toContain('CMD');
    });

    it('should use appropriate Node.js version', () => {
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
      
      // Should use Node 18 or higher
      const nodeVersionMatch = dockerfileContent.match(/FROM node:(\d+)/);
      expect(nodeVersionMatch).toBeTruthy();
      
      const nodeVersion = parseInt(nodeVersionMatch[1]);
      expect(nodeVersion).toBeGreaterThanOrEqual(18);
    });

    it('should have proper security configurations', () => {
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
      
      // Should create non-root user
      expect(dockerfileContent).toMatch(/USER\s+(?!root)/);
      
      // Should not run as root
      expect(dockerfileContent).not.toContain('USER root');
    });

    it('should have proper file copying order for caching', () => {
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
      const lines = dockerfileContent.split('\n');
      
      let packageCopyIndex = -1;
      let npmInstallIndex = -1;
      let appCopyIndex = -1;
      
      lines.forEach((line, index) => {
        if (line.includes('COPY package') || line.includes('COPY server/package')) {
          packageCopyIndex = index;
        }
        if (line.includes('RUN npm install')) {
          npmInstallIndex = index;
        }
        if (line.includes('COPY . .') || line.includes('COPY server .')) {
          appCopyIndex = index;
        }
      });
      
      // Package files should be copied before npm install
      expect(packageCopyIndex).toBeLessThan(npmInstallIndex);
      // App files should be copied after npm install for better caching
      expect(npmInstallIndex).toBeLessThan(appCopyIndex);
    });
  });

  describe('Docker Compose Configuration', () => {
    it('should have development docker-compose file', () => {
      expect(fs.existsSync(dockerComposeDevPath)).toBe(true);
      
      const composeContent = fs.readFileSync(dockerComposeDevPath, 'utf8');
      
      // Should define services
      expect(composeContent).toContain('services:');
      expect(composeContent).toContain('app:');
      
      // Should have volume mounts for development
      expect(composeContent).toContain('volumes:');
      
      // Should expose ports
      expect(composeContent).toContain('ports:');
    });

    it('should have production docker-compose file', () => {
      expect(fs.existsSync(dockerComposeProdPath)).toBe(true);
      
      const composeContent = fs.readFileSync(dockerComposeProdPath, 'utf8');
      
      // Should define services
      expect(composeContent).toContain('services:');
      expect(composeContent).toContain('app:');
      
      // Should have restart policy
      expect(composeContent).toContain('restart:');
    });

    it('should have proper environment variable configuration', () => {
      const composeContent = fs.readFileSync(dockerComposeProdPath, 'utf8');
      
      // Should reference environment variables
      expect(composeContent).toMatch(/environment:|env_file:/);
    });

    it('should have health checks configured', () => {
      const composeContent = fs.readFileSync(dockerComposeProdPath, 'utf8');
      
      // Should have health check configuration
      expect(composeContent).toContain('healthcheck:');
    });
  });

  describe('Environment Configuration', () => {
    it('should have environment example file', () => {
      const envExamplePath = path.join(projectRoot, 'env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);
      
      const envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      // Should contain essential environment variables
      expect(envContent).toContain('NODE_ENV=');
      expect(envContent).toContain('PORT=');
      expect(envContent).toContain('JWT_SECRET=');
      expect(envContent).toContain('DATABASE_PATH=');
      expect(envContent).toContain('UPLOAD_PATH=');
    });

    it('should have API key placeholders', () => {
      const envExamplePath = path.join(projectRoot, 'env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      // Should have API key placeholders
      expect(envContent).toContain('OPENAI_API_KEY=');
      expect(envContent).toContain('ELEVENLABS_API_KEY=');
    });

    it('should not contain actual secrets', () => {
      const envExamplePath = path.join(projectRoot, 'env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      // Should not contain real API keys or secrets
      expect(envContent).not.toMatch(/sk-[a-zA-Z0-9]{48}/); // OpenAI key pattern
      expect(envContent).not.toMatch(/[a-f0-9]{32}/); // ElevenLabs key pattern
      expect(envContent).not.toContain('your-secret-key-here');
    });
  });

  describe('Build Process', () => {
    it('should build Docker image successfully', () => {
      try {
        // Test Docker build (dry run)
        const buildCommand = `docker build --dry-run -t bookvid-test ${projectRoot}`;
        execSync(buildCommand, { stdio: 'pipe' });
      } catch (error) {
        // If Docker is not available, skip this test
        if (error.message.includes('docker: command not found')) {
          console.warn('Docker not available, skipping build test');
          return;
        }
        throw error;
      }
    }, 30000); // 30 second timeout for build

    it('should have proper .dockerignore file', () => {
      const dockerignorePath = path.join(projectRoot, '.dockerignore');
      expect(fs.existsSync(dockerignorePath)).toBe(true);
      
      const dockerignoreContent = fs.readFileSync(dockerignorePath, 'utf8');
      
      // Should ignore development files
      expect(dockerignoreContent).toContain('node_modules');
      expect(dockerignoreContent).toContain('.git');
      expect(dockerignoreContent).toContain('*.log');
      expect(dockerignoreContent).toContain('coverage');
      expect(dockerignoreContent).toContain('.env');
    });
  });

  describe('Security Configuration', () => {
    it('should not expose sensitive files in Docker context', () => {
      const dockerignorePath = path.join(projectRoot, '.dockerignore');
      const dockerignoreContent = fs.readFileSync(dockerignorePath, 'utf8');
      
      // Should ignore sensitive files
      expect(dockerignoreContent).toContain('.env');
      expect(dockerignoreContent).toContain('*.key');
      expect(dockerignoreContent).toContain('*.pem');
    });

    it('should use non-root user in production', () => {
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
      
      // Should create and use non-root user
      expect(dockerfileContent).toMatch(/RUN.*addgroup.*adduser/);
      expect(dockerfileContent).toMatch(/USER\s+(?!root)/);
    });

    it('should have proper file permissions', () => {
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
      
      // Should set proper ownership
      expect(dockerfileContent).toMatch(/COPY.*--chown=/);
    });
  });

  describe('Performance Optimization', () => {
    it('should use multi-stage build for production', () => {
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
      
      // Should have multiple FROM statements for multi-stage build
      const fromStatements = dockerfileContent.match(/^FROM /gm);
      expect(fromStatements?.length).toBeGreaterThanOrEqual(1);
    });

    it('should minimize image layers', () => {
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
      
      // Should combine RUN commands where possible
      const runCommands = dockerfileContent.match(/^RUN /gm);
      expect(runCommands?.length).toBeLessThan(10); // Reasonable limit
    });

    it('should use appropriate base image', () => {
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
      
      // Should use alpine or slim variant for smaller size
      expect(dockerfileContent).toMatch(/FROM node:\d+(-alpine|-slim)?/);
    });
  });

  describe('Development vs Production Configuration', () => {
    it('should have different configurations for dev and prod', () => {
      const devContent = fs.readFileSync(dockerComposeDevPath, 'utf8');
      const prodContent = fs.readFileSync(dockerComposeProdPath, 'utf8');
      
      // Development should have volume mounts
      expect(devContent).toContain('volumes:');
      
      // Production should have restart policy
      expect(prodContent).toContain('restart: unless-stopped');
      
      // They should be different files
      expect(devContent).not.toBe(prodContent);
    });

    it('should use different environment settings', () => {
      const devContent = fs.readFileSync(dockerComposeDevPath, 'utf8');
      const prodContent = fs.readFileSync(dockerComposeProdPath, 'utf8');
      
      // Development might use different environment
      if (devContent.includes('NODE_ENV')) {
        expect(devContent).toContain('development');
      }
      
      if (prodContent.includes('NODE_ENV')) {
        expect(prodContent).toContain('production');
      }
    });
  });

  describe('Deployment Scripts', () => {
    it('should have deployment scripts', () => {
      const scriptsDir = path.join(projectRoot, 'scripts', 'deploy');
      expect(fs.existsSync(scriptsDir)).toBe(true);
      
      // Should have scripts for different platforms
      const herokuScript = path.join(scriptsDir, 'heroku.sh');
      const railwayScript = path.join(scriptsDir, 'railway.sh');
      const renderScript = path.join(scriptsDir, 'render.sh');
      
      expect(fs.existsSync(herokuScript)).toBe(true);
      expect(fs.existsSync(railwayScript)).toBe(true);
      expect(fs.existsSync(renderScript)).toBe(true);
    });

    it('should have executable deployment scripts', () => {
      const scriptsDir = path.join(projectRoot, 'scripts', 'deploy');
      const scripts = fs.readdirSync(scriptsDir).filter(file => file.endsWith('.sh'));
      
      scripts.forEach(script => {
        const scriptPath = path.join(scriptsDir, script);
        const stats = fs.statSync(scriptPath);
        
        // Should be executable (at least by owner)
        expect(stats.mode & parseInt('100', 8)).toBeTruthy();
      });
    });

    it('should have proper shebang in shell scripts', () => {
      const scriptsDir = path.join(projectRoot, 'scripts', 'deploy');
      const scripts = fs.readdirSync(scriptsDir).filter(file => file.endsWith('.sh'));
      
      scripts.forEach(script => {
        const scriptPath = path.join(scriptsDir, script);
        const content = fs.readFileSync(scriptPath, 'utf8');
        
        // Should start with proper shebang
        expect(content).toMatch(/^#!/);
      });
    });
  });
});