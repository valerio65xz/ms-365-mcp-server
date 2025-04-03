import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import fs from 'fs';

describe('Integration Tests', () => {
  it('should have correct package.json configuration', () => {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    expect(packageJson).toHaveProperty('type', 'module');
    expect(packageJson).toHaveProperty('bin.ms-365-mcp-server');
    expect(packageJson.bin['ms-365-mcp-server']).toEqual('index.mjs');
  });

  it('should have all required dependencies', () => {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    const requiredDependencies = [
      '@azure/msal-node',
      '@modelcontextprotocol/sdk',
      'commander',
      'keytar',
      'zod',
    ];

    requiredDependencies.forEach((dep) => {
      expect(packageJson.dependencies).toHaveProperty(dep);
    });
  });

  it('should have all required files', () => {
    const requiredFiles = ['index.mjs', 'auth.mjs', 'cli.mjs', 'package.json', 'README.md'];

    requiredFiles.forEach((file) => {
      const filePath = path.resolve(process.cwd(), file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});
