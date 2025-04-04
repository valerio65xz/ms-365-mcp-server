import { z } from 'zod';

export function registerFilesTools(server, graphClient) {
  server.tool(
    'list-drives',
    {
      userId: z
        .string()
        .optional()
        .describe(
          "ID of the user whose drives to list. If not specified, the current user's drives will be listed."
        ),
    },
    async ({ userId }) => {
      const endpoint = userId ? `/users/${userId}/drives` : '/me/drives';

      return graphClient.graphRequest(endpoint, {
        method: 'GET',
      });
    }
  );

  server.tool(
    'list-files',
    {
      path: z
        .string()
        .optional()
        .describe('Path to list files from. Use "/" for root. Include leading slash.'),
      itemId: z
        .string()
        .optional()
        .describe(
          'ID of the specific item to list children from. Use this instead of path for direct item access.'
        ),
      driveId: z
        .string()
        .optional()
        .describe('ID of the drive to use. If not specified, the default drive will be used.'),
      userId: z
        .string()
        .optional()
        .describe(
          "ID of the user whose drive to access. If not specified, the current user's drive will be used."
        ),
      expand: z
        .string()
        .optional()
        .describe('Comma-separated list of relationships to expand in the response.'),
      select: z
        .string()
        .optional()
        .describe('Comma-separated list of properties to include in the response.'),
      top: z
        .number()
        .optional()
        .describe('Number of items to return in a result. Default and maximum value is 999.'),
    },
    async ({ path, itemId, driveId, userId, expand, select, top }) => {
      let endpoint;

      if (driveId) {
        if (itemId) {
          endpoint = `/drives/${driveId}/items/${itemId}/children`;
        } else if (path === '/' || !path) {
          endpoint = `/drives/${driveId}/root/children`;
        } else {
          endpoint = `/drives/${driveId}/root:${path}:/children`;
        }
      } else if (userId && userId !== 'me') {
        if (itemId) {
          endpoint = `/users/${userId}/drive/items/${itemId}/children`;
        } else if (path === '/' || !path) {
          endpoint = `/users/${userId}/drive/root/children`;
        } else {
          endpoint = `/users/${userId}/drive/root:${path}:/children`;
        }
      } else {
        if (itemId) {
          endpoint = `/me/drive/items/${itemId}/children`;
        } else if (path === '/' || !path) {
          endpoint = `/me/drive/root/children`;
        } else {
          endpoint = `/me/drive/root:${path}:/children`;
        }
      }

      const queryParams = new URLSearchParams();

      if (expand) {
        queryParams.append('$expand', expand);
      }

      if (select) {
        queryParams.append('$select', select);
      }

      if (top) {
        queryParams.append('$top', top.toString());
      }

      const queryString = queryParams.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }

      return graphClient.graphRequest(endpoint, {
        method: 'GET',
      });
    }
  );

  server.tool(
    'get-file',
    {
      path: z
        .string()
        .optional()
        .describe('Path to the file, including leading slash. e.g. "/Documents/report.docx"'),
      itemId: z
        .string()
        .optional()
        .describe(
          'ID of the specific item to retrieve. Use this instead of path for direct item access.'
        ),
      driveId: z
        .string()
        .optional()
        .describe('ID of the drive to use. If not specified, the default drive will be used.'),
      userId: z
        .string()
        .optional()
        .describe(
          "ID of the user whose drive to access. If not specified, the current user's drive will be used."
        ),
      expand: z
        .string()
        .optional()
        .describe('Comma-separated list of relationships to expand in the response.'),
      select: z
        .string()
        .optional()
        .describe('Comma-separated list of properties to include in the response.'),
      includeDeletedItems: z
        .boolean()
        .optional()
        .describe(
          'For OneDrive Personal, specifies whether to include deleted items in the response.'
        ),
    },
    async ({ path, itemId, driveId, userId, expand, select, includeDeletedItems }) => {
      if (!path && !itemId) {
        throw new Error('Either path or itemId must be provided');
      }

      let endpoint;

      if (driveId) {
        if (itemId) {
          endpoint = `/drives/${driveId}/items/${itemId}`;
        } else {
          endpoint = `/drives/${driveId}/root:${path}`;
        }
      } else if (userId && userId !== 'me') {
        if (itemId) {
          endpoint = `/users/${userId}/drive/items/${itemId}`;
        } else {
          endpoint = `/users/${userId}/drive/root:${path}`;
        }
      } else {
        if (itemId) {
          endpoint = `/me/drive/items/${itemId}`;
        } else {
          endpoint = `/me/drive/root:${path}`;
        }
      }

      const queryParams = new URLSearchParams();

      if (expand) {
        queryParams.append('$expand', expand);
      }

      if (select) {
        queryParams.append('$select', select);
      }

      if (includeDeletedItems) {
        queryParams.append('includeDeletedItems', 'true');
      }

      const queryString = queryParams.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }

      return graphClient.graphRequest(endpoint, {
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
      driveId: z
        .string()
        .optional()
        .describe('ID of the drive to use. If not specified, the default drive will be used.'),
    },
    async ({ parentPath, folderName, driveId }) => {
      const folder = {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      };

      const endpoint = driveId
        ? `/drives/${driveId}/root:${parentPath}:/children`
        : `/me/drive/root:${parentPath}:/children`;

      return graphClient.graphRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(folder),
      });
    }
  );

  server.tool(
    'delete-item',
    {
      path: z.string().describe('Path to the file or folder to delete, including leading slash'),
      driveId: z
        .string()
        .optional()
        .describe('ID of the drive to use. If not specified, the default drive will be used.'),
    },
    async ({ path, driveId }) => {
      const endpoint = driveId ? `/drives/${driveId}/root:${path}` : `/me/drive/root:${path}`;

      return graphClient.graphRequest(endpoint, {
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
      sourceDriveId: z
        .string()
        .optional()
        .describe('ID of the source drive. If not specified, the default drive will be used.'),
      destinationDriveId: z
        .string()
        .optional()
        .describe('ID of the destination drive. If not specified, the default drive will be used.'),
    },
    async ({ sourcePath, destinationPath, newName, sourceDriveId, destinationDriveId }) => {
      const copyRequest = {
        parentReference: {
          path: destinationDriveId
            ? `/drives/${destinationDriveId}/root:${destinationPath}`
            : `/drive/root:${destinationPath}`,
        },
      };

      if (newName) {
        copyRequest.name = newName;
      }

      const endpoint = sourceDriveId
        ? `/drives/${sourceDriveId}/root:${sourcePath}:/copy`
        : `/me/drive/root:${sourcePath}:/copy`;

      return graphClient.graphRequest(endpoint, {
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
      sourceDriveId: z
        .string()
        .optional()
        .describe('ID of the source drive. If not specified, the default drive will be used.'),
      destinationDriveId: z
        .string()
        .optional()
        .describe('ID of the destination drive. If not specified, the default drive will be used.'),
    },
    async ({ sourcePath, destinationPath, newName, sourceDriveId, destinationDriveId }) => {
      const moveRequest = {
        parentReference: {
          path: destinationDriveId
            ? `/drives/${destinationDriveId}/root:${destinationPath}`
            : `/drive/root:${destinationPath}`,
        },
      };

      if (newName) {
        moveRequest.name = newName;
      }

      const endpoint = sourceDriveId
        ? `/drives/${sourceDriveId}/root:${sourcePath}`
        : `/me/drive/root:${sourcePath}`;

      return graphClient.graphRequest(endpoint, {
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
      driveId: z
        .string()
        .optional()
        .describe('ID of the drive to use. If not specified, the default drive will be used.'),
    },
    async ({ path, newName, driveId }) => {
      const endpoint = driveId ? `/drives/${driveId}/root:${path}` : `/me/drive/root:${path}`;

      return graphClient.graphRequest(endpoint, {
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
      driveId: z
        .string()
        .optional()
        .describe('ID of the drive to use. If not specified, the default drive will be used.'),
      userId: z
        .string()
        .optional()
        .describe(
          "ID of the user whose drive to search. If not specified, the current user's drive will be used."
        ),
      groupId: z.string().optional().describe('ID of the group whose drive to search.'),
      siteId: z.string().optional().describe('ID of the SharePoint site whose drive to search.'),
      expand: z
        .string()
        .optional()
        .describe('Comma-separated list of relationships to expand in the response.'),
      select: z
        .string()
        .optional()
        .describe('Comma-separated list of properties to include in the response.'),
      top: z.number().optional().describe('Number of items to return in a result set.'),
      orderby: z
        .string()
        .optional()
        .describe('Comma-separated list of properties for sorting results.'),
      skipToken: z
        .string()
        .optional()
        .describe('Paging token from a previous request to continue listing results.'),
    },
    async ({
      query,
      folderPath,
      driveId,
      userId,
      groupId,
      siteId,
      expand,
      select,
      top,
      orderby,
      skipToken,
    }) => {
      const contexts = [driveId, userId, groupId, siteId].filter(Boolean).length;
      if (contexts > 1) {
        throw new Error('Only one of driveId, userId, groupId, or siteId can be specified');
      }

      let endpoint;

      if (driveId) {
        endpoint = folderPath
          ? `/drives/${driveId}/root:${folderPath}:/search(q='`
          : `/drives/${driveId}/root/search(q='`;
      } else if (groupId) {
        endpoint = folderPath
          ? `/groups/${groupId}/drive/root:${folderPath}:/search(q='`
          : `/groups/${groupId}/drive/root/search(q='`;
      } else if (siteId) {
        endpoint = folderPath
          ? `/sites/${siteId}/drive/root:${folderPath}:/search(q='`
          : `/sites/${siteId}/drive/root/search(q='`;
      } else if (userId && userId !== 'me') {
        endpoint = folderPath
          ? `/users/${userId}/drive/root:${folderPath}:/search(q='`
          : `/users/${userId}/drive/root/search(q='`;
      } else {
        endpoint = folderPath
          ? `/me/drive/root:${folderPath}:/search(q='`
          : `/me/drive/root/search(q='`;
      }

      endpoint += encodeURIComponent(query) + "'";
      endpoint += ')';

      const queryParams = new URLSearchParams();

      if (expand) {
        queryParams.append('$expand', expand);
      }

      if (select) {
        queryParams.append('$select', select);
      }

      if (top) {
        queryParams.append('$top', top.toString());
      }

      if (orderby) {
        queryParams.append('$orderby', orderby);
      }

      if (skipToken) {
        queryParams.append('$skipToken', skipToken);
      }

      const queryString = queryParams.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }

      return graphClient.graphRequest(endpoint, {
        method: 'GET',
      });
    }
  );

  server.tool(
    'get-shared-items',
    {
      driveId: z
        .string()
        .optional()
        .describe('ID of the drive to use. If not specified, the default drive will be used.'),
    },
    async ({ driveId }) => {
      const endpoint = driveId ? `/drives/${driveId}/sharedWithMe` : `/me/drive/sharedWithMe`;

      return graphClient.graphRequest(endpoint, {
        method: 'GET',
      });
    }
  );

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
      driveId: z
        .string()
        .optional()
        .describe('ID of the drive to use. If not specified, the default drive will be used.'),
    },
    async ({ path, type, scope, password, expirationDateTime, driveId }) => {
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

      const endpoint = driveId
        ? `/drives/${driveId}/root:${path}:/createLink`
        : `/me/drive/root:${path}:/createLink`;

      return graphClient.graphRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(permissions),
      });
    }
  );

  server.tool(
    'get-file-content',
    {
      path: z.string().describe('Path to the file, including leading slash'),
      driveId: z
        .string()
        .optional()
        .describe('ID of the drive to use. If not specified, the default drive will be used.'),
    },
    async ({ path, driveId }) => {
      const endpoint = driveId
        ? `/drives/${driveId}/root:${path}:/content`
        : `/me/drive/root:${path}:/content`;

      return graphClient.graphRequest(endpoint, {
        method: 'GET',
        rawResponse: true,
      });
    }
  );
}
