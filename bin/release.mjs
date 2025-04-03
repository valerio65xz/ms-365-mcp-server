#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

// First run tests to make sure everything is working
console.log('Running tests...');
try {
  execSync('npm test', { stdio: 'inherit' });
} catch (error) {
  console.error('Tests failed! Aborting release.');
  process.exit(1);
}

console.log('Bumping version...');
execSync('npm version --no-git-tag-version patch');

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

console.log('Committing version change...');
execSync('git add package.json package-lock.json');
execSync(`git commit -m "Bump version to ${version}"`);

console.log('Pushing to remote...');
execSync('git push');

console.log(`Creating GitHub release for v${version}...`);
execSync(`gh release create v${version} --title 'v${version}' --notes 'Version ${version}'`, {
  stdio: 'inherit',
});

console.log(`Release v${version} created successfully!`);
// GitHub Actions workflow will handle the npm publish automatically
