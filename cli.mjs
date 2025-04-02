import { Command } from 'commander';
import AuthManager from './auth.mjs';
import { readFileSync } from 'fs';
import logger from './logger.mjs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
const version = packageJson.version;

const program = new Command();

program
  .name('ms-365-mcp-server')
  .description('Microsoft 365 MCP Server')
  .version(version)
  .option('--login', 'Force login using device code flow')
  .option('--logout', 'Log out and clear saved credentials')
  .option('--file <path>', 'Excel file path to use (default: /Livet.xlsx)')
  .option('--silent', 'Run without informational messages to stderr');

export function parseArgs() {
  program.parse();
  return program.opts();
}

export async function handleAuth(args) {
  const auth = new AuthManager();

  if (args.logout) {
    await auth.logout();
    logger.info('Logged out successfully');
    process.exit(0);
  }

  if (args.login) {
    logger.info('Forcing login with device code...');
    await auth.getToken(true);
    if (!args.silent) {
      logger.info('Logged in successfully');
    }
  } else {
    if (!args.silent) {
      logger.info('Authenticating...');
    }
    await auth.getToken();
    if (!args.silent) {
      logger.info('Logged in successfully');
    }
  }

  return auth;
}
