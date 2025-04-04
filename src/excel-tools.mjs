import { z } from 'zod';

export function registerExcelTools(server, graphClient) {
  server.tool(
    'update-excel',
    {
      filePath: z
        .string()
        .describe(
          'Path to the Excel file, including leading slash (e.g., "/Documents/budget.xlsx")'
        ),
      worksheet: z.string().default('Sheet1').describe('Worksheet name'),
      address: z.string().describe("Range address (e.g., 'A1:B5')"),
      values: z.array(z.array(z.any())).describe('Values to update'),
    },
    async ({ filePath, worksheet, address, values }) => {
      return graphClient.graphRequest(
        `/workbook/worksheets('${worksheet}')/range(address='${address}')`,
        {
          method: 'PATCH',
          body: JSON.stringify({ values }),
          excelFile: filePath,
        }
      );
    }
  );

  server.tool(
    'create-chart',
    {
      filePath: z
        .string()
        .describe(
          'Path to the Excel file, including leading slash (e.g., "/Documents/budget.xlsx")'
        ),
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
    async ({ filePath, worksheet, type, dataRange, title, position }) => {
      const body = {
        type,
        sourceData: dataRange,
        position,
      };

      if (title) {
        body.title = { text: title };
      }

      return graphClient.graphRequest(`/workbook/worksheets('${worksheet}')/charts/add`, {
        method: 'POST',
        body: JSON.stringify(body),
        excelFile: filePath,
      });
    }
  );

  server.tool(
    'format-range',
    {
      filePath: z
        .string()
        .describe(
          'Path to the Excel file, including leading slash (e.g., "/Documents/budget.xlsx")'
        ),
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
          numberFormat: z
            .string()
            .optional()
            .describe("Number format (e.g., '0.00%', 'mm/dd/yyyy')"),
        })
        .describe('Formatting to apply'),
    },
    async ({ filePath, worksheet, range, format }) => {
      return graphClient.graphRequest(
        `/workbook/worksheets('${worksheet}')/range(address='${range}')/format`,
        {
          method: 'PATCH',
          body: JSON.stringify(format),
          excelFile: filePath,
        }
      );
    }
  );

  server.tool(
    'sort-range',
    {
      filePath: z
        .string()
        .describe(
          'Path to the Excel file, including leading slash (e.g., "/Documents/budget.xlsx")'
        ),
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
    async ({
      filePath,
      worksheet,
      range,
      sortFields,
      matchCase,
      hasHeaders,
      orientation,
      method,
    }) => {
      const body = {
        fields: sortFields,
      };

      if (matchCase !== undefined) body.matchCase = matchCase;
      if (hasHeaders !== undefined) body.hasHeaders = hasHeaders;
      if (orientation) body.orientation = orientation;
      if (method) body.method = method;

      return graphClient.graphRequest(
        `/workbook/worksheets('${worksheet}')/range(address='${range}')/sort/apply`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          excelFile: filePath,
        }
      );
    }
  );

  server.tool(
    'create-table',
    {
      filePath: z
        .string()
        .describe(
          'Path to the Excel file, including leading slash (e.g., "/Documents/budget.xlsx")'
        ),
      worksheet: z.string().default('Sheet1').describe('Worksheet name'),
      range: z.string().describe("Range address (e.g., 'A1:B5')"),
      hasHeaders: z.boolean().optional().describe('Whether the range has headers'),
      tableName: z.string().optional().describe('Name for the new table'),
    },
    async ({ filePath, worksheet, range, hasHeaders = true, tableName }) => {
      const body = {
        address: range,
        hasHeaders,
      };

      if (tableName) {
        body.name = tableName;
      }

      return graphClient.graphRequest(`/workbook/worksheets('${worksheet}')/tables/add`, {
        method: 'POST',
        body: JSON.stringify(body),
        excelFile: filePath,
      });
    }
  );

  server.tool(
    'get-range',
    {
      filePath: z
        .string()
        .describe(
          'Path to the Excel file, including leading slash (e.g., "/Documents/budget.xlsx")'
        ),
      worksheet: z.string().default('Sheet1').describe('Worksheet name'),
      range: z.string().describe("Range address (e.g., 'A1:B5')"),
    },
    async ({ filePath, worksheet, range }) => {
      return graphClient.graphRequest(
        `/workbook/worksheets('${worksheet}')/range(address='${range}')`,
        {
          method: 'GET',
          excelFile: filePath,
        }
      );
    }
  );

  server.tool(
    'list-worksheets',
    {
      filePath: z
        .string()
        .describe(
          'Path to the Excel file, including leading slash (e.g., "/Documents/budget.xlsx")'
        ),
    },
    async ({ filePath }) => {
      return graphClient.graphRequest('/workbook/worksheets', {
        method: 'GET',
        excelFile: filePath,
      });
    }
  );

  server.tool(
    'close-session',
    {
      filePath: z
        .string()
        .describe(
          'Path to the Excel file, including leading slash (e.g., "/Documents/budget.xlsx")'
        ),
    },
    async ({ filePath }) => {
      return graphClient.closeSession(filePath);
    }
  );

  server.tool(
    'delete-chart',
    {
      filePath: z
        .string()
        .describe(
          'Path to the Excel file, including leading slash (e.g., "/Documents/budget.xlsx")'
        ),
      worksheet: z.string().default('Sheet1').describe('Worksheet name'),
      chartName: z.string().describe('The name of the chart to delete'),
    },
    async ({ filePath, worksheet, chartName }) => {
      return graphClient.graphRequest(
        `/workbook/worksheets('${worksheet}')/charts('${chartName}')`,
        {
          method: 'DELETE',
          excelFile: filePath,
        }
      );
    }
  );

  server.tool(
    'get-charts',
    {
      filePath: z
        .string()
        .describe(
          'Path to the Excel file, including leading slash (e.g., "/Documents/budget.xlsx")'
        ),
      worksheet: z.string().default('Sheet1').describe('Worksheet name'),
    },
    async ({ filePath, worksheet }) => {
      return graphClient.graphRequest(`/workbook/worksheets('${worksheet}')/charts`, {
        method: 'GET',
        excelFile: filePath,
      });
    }
  );

  server.tool('close-all-sessions', {}, async () => {
    return graphClient.closeAllSessions();
  });
}
