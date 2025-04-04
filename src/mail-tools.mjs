import { z } from 'zod';

export function registerMailTools(server, graphClient) {
  server.tool(
    'list-messages',
    {
      folderName: z
        .string()
        .optional()
        .describe('Name of the folder to get messages from (e.g., "inbox", "drafts", "sentitems")'),
      folderId: z
        .string()
        .optional()
        .describe('ID of the folder to get messages from (instead of folderName)'),
      filter: z.string().optional().describe('OData filter query (e.g., "isRead eq false")'),
      select: z.array(z.string()).optional().describe('Properties to include in the response'),
      top: z.number().optional().describe('Maximum number of messages to return'),
      skip: z.number().optional().describe('Number of messages to skip'),
      count: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include a count of the total number of messages'),
      orderBy: z
        .string()
        .optional()
        .describe('Property to sort by (e.g., "receivedDateTime desc")'),
      search: z.string().optional().describe('Text to search for in messages'),
    },
    async ({ folderName, folderId, filter, select, top, skip, count, orderBy, search }) => {
      let endpoint;

      if (folderId) {
        endpoint = `/me/mailFolders/${folderId}/messages`;
      } else if (folderName) {
        const standardFolderName = folderName.toLowerCase();
        endpoint = `/me/mailFolders/${standardFolderName}/messages`;
      } else {
        endpoint = '/me/messages';
      }

      const queryParams = [];

      if (filter) {
        queryParams.push(`$filter=${encodeURIComponent(filter)}`);
      }

      if (select && select.length > 0) {
        queryParams.push(`$select=${select.join(',')}`);
      } else {
        queryParams.push(
          '$select=id,subject,receivedDateTime,from,isRead,importance,hasAttachments'
        );
      }

      if (top) {
        queryParams.push(`$top=${top}`);
      }

      if (skip) {
        queryParams.push(`$skip=${skip}`);
      }

      if (count) {
        queryParams.push('$count=true');
      }

      if (orderBy) {
        queryParams.push(`$orderby=${encodeURIComponent(orderBy)}`);
      }

      if (search) {
        queryParams.push(`$search="${encodeURIComponent(search)}"`);
      }

      if (queryParams.length > 0) {
        endpoint += '?' + queryParams.join('&');
      }

      return graphClient.graphRequest(endpoint, {
        method: 'GET',
      });
    }
  );
}
