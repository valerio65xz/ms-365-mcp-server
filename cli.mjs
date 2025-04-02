import { Command } from 'commander';
import AuthManager from './auth.mjs';

const program = new Command();

program
  .name('ms-365-mcp-server')
  .description('Microsoft 365 MCP Server')
  .version('0.1.0')
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
    process.stderr.write('Logged out successfully\n');
    process.exit(0);
  }

  if (args.login) {
    process.stderr.write('Forcing login with device code...\n');
    await auth.getToken(true);
    if (!args.silent) {
      process.stderr.write('Logged in, have a nice day lol\n');
    }
  } else {
    if (!args.silent) {
      process.stderr.write('Authenticating...\n');
    }
    await auth.getToken();
    if (!args.silent) {
      process.stderr.write('Logged in, have a nice day lol\n');
    }
  }

  return auth;
}
