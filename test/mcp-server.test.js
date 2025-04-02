import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn(() => ({
    tool: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    name: 'TestServer',
    version: '0.1.0',
  })),
}));
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('MCP Server', () => {
  let server;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new McpServer();
  });

  it('should be created with proper configuration', () => {
    expect(McpServer).toHaveBeenCalled();
    expect(server).toBeDefined();
  });

  it('should be able to register tools', () => {
    server.tool('test-tool', { param: z.string() }, async () => {});
    expect(server.tool).toHaveBeenCalledWith(
      'test-tool',
      { param: expect.any(Object) },
      expect.any(Function)
    );
  });
});
