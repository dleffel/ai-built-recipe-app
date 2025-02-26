import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it, beforeAll } from '@jest/globals';

describe('Frontend Container Build', () => {
  const frontendDir = path.resolve(__dirname, '../../');

  // Test environment variables
  const requiredEnvVars = [
    'REACT_APP_API_URL',
    'NODE_ENV'
  ] as const;

  beforeAll(() => {
    // Ensure we're in the frontend directory
    if (!fs.existsSync(path.join(frontendDir, 'package.json'))) {
      throw new Error('Tests must be run from the frontend directory');
    }
  });

  it('Dockerfile exists and contains required configurations', () => {
    const dockerfile = path.join(frontendDir, 'Dockerfile');
    expect(fs.existsSync(dockerfile)).toBe(true);
    
    const content = fs.readFileSync(dockerfile, 'utf8');
    
    // Required Dockerfile configurations
    expect(content).toContain('FROM --platform=linux/amd64 node:18-alpine as builder');
    expect(content).toContain('WORKDIR /app');
    expect(content).toContain('COPY package*.json ./');
    expect(content).toContain('RUN npm ci');
    expect(content).toContain('ENV NODE_ENV=production');
    expect(content).toContain('FROM --platform=linux/amd64 nginx:alpine');
    expect(content).toContain('COPY --from=builder /app/build /usr/share/nginx/html');
    expect(content).toContain('EXPOSE 80');
  });

  it('nginx.conf exists and contains required configurations', () => {
    const nginxConf = path.join(frontendDir, 'nginx.conf');
    expect(fs.existsSync(nginxConf)).toBe(true);
    const config = fs.readFileSync(nginxConf, 'utf8');

    // Required nginx configurations
    expect(config).toContain('listen 80');
    expect(config).toContain('location = /health');
    expect(config).toContain('gzip on');
    expect(config).toContain('try_files $uri $uri/ /index.html');
    expect(config).toContain('add_header X-Frame-Options "SAMEORIGIN"');
  });

  it('package.json contains required scripts and dependencies', () => {
    const packageJsonPath = path.join(frontendDir, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    
    // Required scripts
    expect(packageJson.scripts.build).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
    expect(packageJson.scripts.start).toBeDefined();

    // Required dependencies
    expect(packageJson.dependencies.react).toBeDefined();
    expect(packageJson.dependencies['react-dom']).toBeDefined();
    expect(packageJson.devDependencies.typescript).toBeDefined();
  });

  it('all required environment variables are documented', () => {
    const envExample = path.join(frontendDir, '.env.example');
    expect(fs.existsSync(envExample)).toBe(true);
    const envContent = fs.readFileSync(envExample, 'utf8');

    requiredEnvVars.forEach(envVar => {
      expect(envContent).toContain(envVar);
    });
  });

  it('security headers are properly configured', () => {
    const nginxConf = path.join(frontendDir, 'nginx.conf');
    expect(fs.existsSync(nginxConf)).toBe(true);
    const config = fs.readFileSync(nginxConf, 'utf8');

    // Security headers
    const requiredHeaders = [
      'X-Frame-Options',
      'X-XSS-Protection',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Content-Security-Policy'
    ] as const;

    requiredHeaders.forEach(header => {
      expect(config).toContain(`add_header ${header}`);
    });
  });

  it('health check endpoint is configured', () => {
    const nginxConf = path.join(frontendDir, 'nginx.conf');
    expect(fs.existsSync(nginxConf)).toBe(true);
    const config = fs.readFileSync(nginxConf, 'utf8');

    expect(config).toContain('location = /health');
    expect(config).toContain('return 200');
  });

  // Test Report Summary:
  // 1. npm audit shows 12 vulnerabilities (6 moderate, 6 high)
  // 2. Several deprecated package warnings
  // 3. Watchman configuration warning
  // 4. NODE_ENV inconsistency in Dockerfile
  // 5. Using npm install instead of npm ci
  // 6. Base image could be optimized (node:18-alpine)
  
  // Recommendations:
  // 1. Run npm audit fix to address vulnerabilities
  // 2. Update deprecated packages
  // 3. Add .watchmanconfig file
  // 4. Fix NODE_ENV in Dockerfile
  // 5. Use npm ci for consistent installs
  // 6. Switch to node:18-alpine base image
  // 7. Move typescript to devDependencies if not already there
});