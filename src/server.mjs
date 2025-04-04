import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import logger, { enableConsoleLogging } from './logger.mjs';
import { registerTools } from './tools.mjs';
import GraphClient from './graph-client.mjs';

class MicrosoftExcelServer {
  constructor(authManager, options = {}) {
    this.authManager = authManager;
    this.options = options;
    this.filePath = options.file || '/Livet.xlsx';
    this.graphClient = new GraphClient(authManager, this.filePath);
    this.server = null;
  }

  async initialize(version) {
    this.server = new McpServer({
      name: 'ExcelUpdater',
      version,
    });
    registerTools(this.server, this.graphClient, this.authManager);
    await this.graphClient.createSession();
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

export default MicrosoftExcelServer;
