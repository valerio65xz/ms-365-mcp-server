import { z } from 'zod';

export function registerMailTools(server, graphClient) {
  server.tool(
    'get-message',
    {
      messageId: z.string().describe('ID of the message to retrieve'),
      select: z.array(z.string()).optional().describe('Properties to include in the response'),
      expandAttachments: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include attachment details'),
      expandMentions: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include @mention details'),
      expandSingleValueExtendedProperties: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include single value extended properties'),
      expandMultiValueExtendedProperties: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include multi-value extended properties'),
    },
    async ({
      messageId,
      select,
      expandAttachments,
      expandMentions,
      expandSingleValueExtendedProperties,
      expandMultiValueExtendedProperties,
    }) => {
      let endpoint = `/me/messages/${messageId}`;

      const queryParams = [];

      if (select && select.length > 0) {
        queryParams.push(`$select=${select.join(',')}`);
      }

      const expandParams = [];

      if (expandAttachments) {
        expandParams.push('attachments');
      }

      if (expandMentions) {
        expandParams.push('mentions');
      }

      if (expandSingleValueExtendedProperties) {
        expandParams.push('singleValueExtendedProperties');
      }

      if (expandMultiValueExtendedProperties) {
        expandParams.push('multiValueExtendedProperties');
      }

      if (expandParams.length > 0) {
        queryParams.push(`$expand=${expandParams.join(',')}`);
      }

      if (queryParams.length > 0) {
        endpoint += '?' + queryParams.join('&');
      }

      return graphClient.graphRequest(endpoint, {
        method: 'GET',
      });
    }
  );

  server.tool(
    'list-messages',
    {
      folderName: z
        .string()
        .optional()
        .describe('Name of the folder to get messages from (e.g., "inbox", "drafts", "sentItems")'),
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
        queryParams.push(`$orderBy=${encodeURIComponent(orderBy)}`);
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
