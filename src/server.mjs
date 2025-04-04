import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import logger, { enableConsoleLogging } from './logger.mjs';
import { registerExcelTools } from './excel-tools.mjs';
import { registerAuthTools } from './auth-tools.mjs';
import { registerFilesTools } from './files-tools.mjs';
import GraphClient from './graph-client.mjs';

class MicrosoftGraphServer {
  constructor(authManager, options = {}) {
    this.authManager = authManager;
    this.options = options;
    this.filePath = options.file || '/Livet.xlsx';
    this.graphClient = new GraphClient(authManager, this.filePath);
    this.server = null;
  }

  async initialize(version) {
    this.server = new McpServer({
      name: 'Microsoft365MCP',
      version,
    });

    registerAuthTools(this.server, this.authManager);
    registerFilesTools(this.server, this.graphClient);
    registerExcelTools(this.server, this.graphClient);

    if (!this.options.login && !this.options.testLogin) {
      await this.graphClient.createSession();
    }
  }

  async start() {
    if (this.options.v) {
      enableConsoleLogging();
    }

    logger.info('Microsoft 365 MCP Server starting...');

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Server connected to transport');
  }
}

export default MicrosoftGraphServer;
