import { Command } from 'commander';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
const version = packageJson.version;

const program = new Command();

program
  .name('ms-365-mcp-server')
  .description('Microsoft 365 MCP Server')
  .version(version)
  .option('-v', 'Enable verbose logging')
  .option('--login', 'Login using device code flow')
  .option('--logout', 'Log out and clear saved credentials')
  .option('--test-login', 'Test login without starting the server');

export function parseArgs() {
  program.parse();
  return program.opts();
}
