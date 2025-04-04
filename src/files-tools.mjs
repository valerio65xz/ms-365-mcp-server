import { z } from 'zod';

export function registerFilesTools(server, graphClient) {
  server.tool(
    'list-files',
    {
      path: z
        .string()
        .default('/')
        .describe('Path to list files from. Use "/" for root. Include leading slash.'),
    },
    async ({ path }) => {
      return graphClient.graphRequest(`/drive/root:${path}:/children`, {
        method: 'GET',
      });
    }
  );

  server.tool(
    'get-file',
    {
      path: z
        .string()
        .describe('Path to the file, including leading slash. e.g. "/Documents/report.docx"'),
    },
    async ({ path }) => {
      return graphClient.graphRequest(`/drive/root:${path}`, {
        method: 'GET',
      });
    }
  );

  server.tool(
    'create-folder',
    {
      parentPath: z
        .string()
        .default('/')
        .describe('Parent folder path. Use "/" for root. Include leading slash.'),
      folderName: z.string().describe('Name of the folder to create'),
    },
    async ({ parentPath, folderName }) => {
      const folder = {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      };

      return graphClient.graphRequest(`/drive/root:${parentPath}:/children`, {
        method: 'POST',
        body: JSON.stringify(folder),
      });
    }
  );

  server.tool(
    'delete-item',
    {
      path: z.string().describe('Path to the file or folder to delete, including leading slash'),
    },
    async ({ path }) => {
      return graphClient.graphRequest(`/drive/root:${path}`, {
        method: 'DELETE',
      });
    }
  );

  server.tool(
    'copy-item',
    {
      sourcePath: z.string().describe('Path to the source file or folder, including leading slash'),
      destinationPath: z
        .string()
        .describe('Path to the destination parent folder, including leading slash'),
      newName: z.string().optional().describe('New name for the item (optional)'),
    },
    async ({ sourcePath, destinationPath, newName }) => {
      const copyRequest = {
        parentReference: {
          path: `/drive/root:${destinationPath}`,
        },
      };

      if (newName) {
        copyRequest.name = newName;
      }

      return graphClient.graphRequest(`/drive/root:${sourcePath}:/copy`, {
        method: 'POST',
        body: JSON.stringify(copyRequest),
      });
    }
  );

  server.tool(
    'move-item',
    {
      sourcePath: z.string().describe('Path to the source file or folder, including leading slash'),
      destinationPath: z
        .string()
        .describe('Path to the destination parent folder, including leading slash'),
      newName: z.string().optional().describe('New name for the item (optional)'),
    },
    async ({ sourcePath, destinationPath, newName }) => {
      const moveRequest = {
        parentReference: {
          path: `/drive/root:${destinationPath}`,
        },
      };

      if (newName) {
        moveRequest.name = newName;
      }

      return graphClient.graphRequest(`/drive/root:${sourcePath}`, {
        method: 'PATCH',
        body: JSON.stringify(moveRequest),
      });
    }
  );

  server.tool(
    'rename-item',
    {
      path: z.string().describe('Path to the file or folder, including leading slash'),
      newName: z.string().describe('New name for the item'),
    },
    async ({ path, newName }) => {
      return graphClient.graphRequest(`/drive/root:${path}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName }),
      });
    }
  );

  server.tool(
    'search-files',
    {
      query: z.string().describe('Search query text'),
      folderPath: z
        .string()
        .optional()
        .describe('Optional folder path to limit search scope. Include leading slash.'),
    },
    async ({ query, folderPath }) => {
      let endpoint = "/drive/root/search(q='";

      if (folderPath) {
        endpoint = `/drive/root:${folderPath}:/search(q='`;
      }

      endpoint += encodeURIComponent(query) + "'";
      endpoint += ')';

      return graphClient.graphRequest(endpoint, {
        method: 'GET',
      });
    }
  );

  server.tool('get-shared-items', {}, async () => {
    return graphClient.graphRequest('/drive/sharedWithMe', {
      method: 'GET',
    });
  });

  server.tool(
    'create-sharing-link',
    {
      path: z.string().describe('Path to the file or folder, including leading slash'),
      type: z
        .enum(['view', 'edit', 'embed'])
        .default('view')
        .describe('Type of sharing link to create'),
      scope: z
        .enum(['anonymous', 'organization'])
        .default('anonymous')
        .describe('Scope of the sharing link'),
      password: z.string().optional().describe('Password for the sharing link (optional)'),
      expirationDateTime: z
        .string()
        .optional()
        .describe('Expiration date and time (ISO format, optional)'),
    },
    async ({ path, type, scope, password, expirationDateTime }) => {
      const permissions = {
        type: type,
        scope: scope,
      };

      if (password) {
        permissions.password = password;
      }

      if (expirationDateTime) {
        permissions.expirationDateTime = expirationDateTime;
      }

      return graphClient.graphRequest(`/drive/root:${path}:/createLink`, {
        method: 'POST',
        body: JSON.stringify(permissions),
      });
    }
  );

  server.tool(
    'get-file-content',
    {
      path: z.string().describe('Path to the file, including leading slash'),
    },
    async ({ path }) => {
      return graphClient.graphRequest(`/drive/root:${path}:/content`, {
        method: 'GET',
        rawResponse: true,
      });
    }
  );
}
