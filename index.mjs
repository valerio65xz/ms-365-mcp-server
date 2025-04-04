#!/usr/bin/env node

import { parseArgs } from './src/cli.mjs';
import logger from './src/logger.mjs';
import AuthManager from './src/auth.mjs';
import MicrosoftExcelServer from './src/server.mjs';
import { version } from './src/version.mjs';

async function main() {
  try {
    const args = parseArgs();

    const authManager = new AuthManager();
    await authManager.loadTokenCache();

    if (args.login) {
      await authManager.acquireTokenByDeviceCode();
      logger.info('Login completed, testing connection with Graph API...');
      const result = await authManager.testLogin();
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    if (args.testLogin) {
      logger.info('Testing login...');
      const result = await authManager.testLogin();
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    if (args.logout) {
      await authManager.logout();
      console.log(JSON.stringify({ message: 'Logged out successfully' }));
      process.exit(0);
    }

    const server = new MicrosoftExcelServer(authManager, args);
    await server.initialize(version);
    await server.start();
  } catch (error) {
    logger.error(`Startup error: ${error}`);
    process.exit(1);
  }
}

main();
