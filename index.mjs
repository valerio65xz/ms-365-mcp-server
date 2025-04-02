#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { parseArgs, handleAuth } from './cli.mjs';

const args = parseArgs();
const filePath = args.file || '/Livet.xlsx';

let authManager;

let sessionId = null;

async function createSession() {
  try {
    process.stderr.write('Creating new Excel session...\n');
    const accessToken = await authManager.getToken();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/workbook/createSession`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ persistChanges: true }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      process.stderr.write(`Failed to create session: ${response.status} - ${errorText}\n`);
      return null;
    }

    const result = await response.json();
    process.stderr.write('Session created successfully\n');
    sessionId = result.id;
    return sessionId;
  } catch (error) {
    process.stderr.write(`Error creating Excel session: ${error}\n`);
    return null;
  }
}

async function graphRequest(endpoint, options = {}) {
  try {
    const accessToken = await authManager.getToken();

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(sessionId && { 'workbook-session-id': sessionId }),
      ...options.headers,
    };

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:${endpoint}`,
      {
        headers,
        ...options,
      }
    );

    if (response.status === 401) {
      process.stderr.write('Access token expired, refreshing...\n');
      const newToken = await authManager.getToken(true);
      await createSession();

      headers.Authorization = `Bearer ${newToken}`;
      if (sessionId) {
        headers['workbook-session-id'] = sessionId;
      }

      const retryResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:${endpoint}`,
        {
          headers,
          ...options,
        }
      );

      if (!retryResponse.ok) {
        throw new Error(`Graph API error: ${retryResponse.status} ${await retryResponse.text()}`);
      }

      return formatResponse(retryResponse);
    }

    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status} ${await response.text()}`);
    }

    return formatResponse(response);
  } catch (error) {
    process.stderr.write(`Error in Graph API request: ${error}\n`);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
    };
  }
}

async function formatResponse(response) {
  try {
    if (response.status === 204) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Operation completed successfully',
            }),
          },
        ],
      };
    }

    const result = await response.json();

    const removeODataProps = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        obj.forEach((item) => removeODataProps(item));
      } else {
        Object.keys(obj).forEach((key) => {
          if (key.startsWith('@odata')) {
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            removeODataProps(obj[key]);
          }
        });
      }
    };

    removeODataProps(result);

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ message: 'Success' }) }],
    };
  }
}

const server = new McpServer({
  name: 'ExcelUpdater',
  version: '0.1.0',
});

server.tool('login', {}, async () => {
  try {
    await authManager.getToken(true);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message: 'Authentication successful' }),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'Authentication failed' }),
        },
      ],
    };
  }
});

server.tool('logout', {}, async () => {
  try {
    await authManager.logout();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message: 'Logged out successfully' }),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'Logout failed' }),
        },
      ],
    };
  }
});

server.tool(
  'update-excel',
  {
    worksheet: z.string().default('Sheet1').describe('Worksheet name'),
    address: z.string().describe("Range address (e.g., 'A1:B5')"),
    values: z.array(z.array(z.any())).describe('Values to update'),
  },
  async ({ worksheet, address, values }) => {
    return graphRequest(`/workbook/worksheets('${worksheet}')/range(address='${address}')`, {
      method: 'PATCH',
      body: JSON.stringify({ values }),
    });
  }
);

server.tool(
  'create-chart',
  {
    worksheet: z.string().default('Sheet1').describe('Worksheet name'),
    type: z.string().describe("Chart type (e.g., 'ColumnClustered', 'Line', 'Pie')"),
    dataRange: z.string().describe("Data range for the chart (e.g., 'A1:B10')"),
    title: z.string().optional().describe('Title for the chart'),
    position: z
      .object({
        x: z.number().describe('X position'),
        y: z.number().describe('Y position'),
        width: z.number().describe('Width'),
        height: z.number().describe('Height'),
      })
      .describe('Chart position and dimensions'),
  },
  async ({ worksheet, type, dataRange, title, position }) => {
    const body = {
      type,
      sourceData: dataRange,
      position,
    };

    if (title) {
      body.title = { text: title };
    }

    return graphRequest(`/workbook/worksheets('${worksheet}')/charts/add`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
);

server.tool(
  'format-range',
  {
    worksheet: z.string().default('Sheet1').describe('Worksheet name'),
    range: z.string().describe("Range address (e.g., 'A1:B5')"),
    format: z
      .object({
        fill: z
          .object({
            color: z.string().optional().describe("Background color (e.g., '#FFFF00')"),
          })
          .optional(),
        font: z
          .object({
            bold: z.boolean().optional().describe('Bold text'),
            italic: z.boolean().optional().describe('Italic text'),
            color: z.string().optional().describe("Font color (e.g., '#FF0000')"),
            size: z.number().optional().describe('Font size'),
          })
          .optional(),
        numberFormat: z.string().optional().describe("Number format (e.g., '0.00%', 'mm/dd/yyyy')"),
      })
      .describe('Formatting to apply'),
  },
  async ({ worksheet, range, format }) => {
    return graphRequest(`/workbook/worksheets('${worksheet}')/range(address='${range}')/format`, {
      method: 'PATCH',
      body: JSON.stringify(format),
    });
  }
);

server.tool(
  'sort-range',
  {
    worksheet: z.string().default('Sheet1').describe('Worksheet name'),
    range: z.string().describe("Range address (e.g., 'A1:B5')"),
    sortFields: z
      .array(
        z.object({
          key: z.number().describe('Column index to sort by (zero-based)'),
          sortOn: z
            .string()
            .optional()
            .describe("Sorting criteria (e.g., 'Value', 'CellColor', 'FontColor', 'Icon')"),
          ascending: z.boolean().optional().describe('Sort in ascending order (default: true)'),
          color: z
            .object({
              color: z.string().describe('HTML color code'),
              type: z.string().describe("Color type (e.g., 'Background', 'Font')"),
            })
            .optional()
            .describe('Color information for sorting by color'),
          dataOption: z
            .string()
            .optional()
            .describe("Data option for sorting (e.g., 'Normal', 'TextAsNumber')"),
          icon: z
            .object({
              set: z.string().describe('Icon set name'),
              index: z.number().describe('Icon index'),
            })
            .optional()
            .describe('Icon information for sorting by icon'),
        })
      )
      .describe('Fields to sort by'),
    matchCase: z.boolean().optional().describe('Whether the sort is case-sensitive'),
    hasHeaders: z.boolean().optional().describe('Whether the range has headers (default: false)'),
    orientation: z.string().optional().describe("Sort orientation ('Rows' or 'Columns')"),
    method: z
      .string()
      .optional()
      .describe("Sort method for Chinese characters ('PinYin' or 'StrokeCount')"),
  },
  async ({ worksheet, range, sortFields, matchCase, hasHeaders, orientation, method }) => {
    const body = {
      fields: sortFields,
    };

    if (matchCase !== undefined) body.matchCase = matchCase;
    if (hasHeaders !== undefined) body.hasHeaders = hasHeaders;
    if (orientation) body.orientation = orientation;
    if (method) body.method = method;

    return graphRequest(
      `/workbook/worksheets('${worksheet}')/range(address='${range}')/sort/apply`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  }
);

server.tool(
  'create-table',
  {
    worksheet: z.string().default('Sheet1').describe('Worksheet name'),
    range: z.string().describe("Range address (e.g., 'A1:B5')"),
    hasHeaders: z.boolean().optional().describe('Whether the range has headers'),
    tableName: z.string().optional().describe('Name for the new table'),
  },
  async ({ worksheet, range, hasHeaders = true, tableName }) => {
    const body = {
      address: range,
      hasHeaders,
    };

    if (tableName) {
      body.name = tableName;
    }

    return graphRequest(`/workbook/worksheets('${worksheet}')/tables/add`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
);

server.tool(
  'get-range',
  {
    worksheet: z.string().default('Sheet1').describe('Worksheet name'),
    range: z.string().describe("Range address (e.g., 'A1:B5')"),
  },
  async ({ worksheet, range }) => {
    return graphRequest(`/workbook/worksheets('${worksheet}')/range(address='${range}')`, {
      method: 'GET',
    });
  }
);

server.tool('list-worksheets', {}, async () => {
  return graphRequest('/workbook/worksheets', {
    method: 'GET',
  });
});

server.tool('close-session', {}, async () => {
  if (!sessionId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message: 'No active session' }),
        },
      ],
    };
  }

  try {
    const accessToken = await authManager.getToken();
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/workbook/closeSession`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'workbook-session-id': sessionId,
        },
      }
    );

    if (response.ok) {
      sessionId = null;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ message: 'Session closed successfully' }),
          },
        ],
      };
    } else {
      throw new Error(`Failed to close session: ${response.status}`);
    }
  } catch (error) {
    process.stderr.write(`Error closing session: ${error}\n`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'Failed to close session' }),
        },
      ],
    };
  }
});

server.tool(
  'delete-chart',
  {
    worksheet: z.string().default('Sheet1').describe('Worksheet name'),
    chartName: z.string().describe('The name of the chart to delete'),
  },
  async ({ worksheet, chartName }) => {
    return graphRequest(`/workbook/worksheets('${worksheet}')/charts('${chartName}')`, {
      method: 'DELETE',
    });
  }
);

server.tool(
  'get-charts',
  {
    worksheet: z.string().default('Sheet1').describe('Worksheet name'),
  },
  async ({ worksheet }) => {
    return graphRequest(`/workbook/worksheets('${worksheet}')/charts`, {
      method: 'GET',
    });
  }
);

async function main() {
  try {
    process.stderr.write('Microsoft 365 MCP Server starting...\n');
    authManager = await handleAuth(args);

    await createSession();

    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    process.stderr.write(`Startup error: ${error}\n`);
    process.exit(1);
  }
}

main();
