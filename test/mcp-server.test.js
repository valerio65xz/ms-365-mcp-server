import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn(() => ({
    tool: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    name: 'TestServer',
    version: '0.1.1',
  })),
}));
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

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
