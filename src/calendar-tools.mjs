import { z } from 'zod';

export function registerCalendarTools(server, graphClient) {
  server.tool('list-calendars', {}, async () => {
    return graphClient.graphRequest('/me/calendars', {
      method: 'GET',
    });
  });

  server.tool('get-default-calendar', {}, async () => {
    return graphClient.graphRequest('/me/calendar', {
      method: 'GET',
    });
  });

  server.tool(
    'list-events',
    {
      calendarId: z
        .string()
        .optional()
        .describe('ID of the calendar (leave empty for default calendar)'),
      startDateTime: z
        .string()
        .optional()
        .describe('Start date/time in ISO format (e.g., "2023-01-01T00:00:00Z")'),
      endDateTime: z
        .string()
        .optional()
        .describe('End date/time in ISO format (e.g., "2023-12-31T23:59:59Z")'),
      top: z.number().optional().default(10).describe('Maximum number of events to retrieve'),
      filter: z.string().optional().describe('OData filter query (e.g., "subject eq \'Meeting\'")'),
      orderBy: z
        .string()
        .optional()
        .default('start/dateTime')
        .describe('Order by clause (e.g., "start/dateTime asc")'),
    },
    async ({ calendarId, startDateTime, endDateTime, top, filter, orderBy }) => {
      let endpoint = calendarId ? `/me/calendars/${calendarId}/events` : '/me/calendar/events';

      const queryParams = [];

      if (startDateTime && endDateTime) {
        endpoint = endpoint.replace('/events', '/calendarView');
        queryParams.push(`startDateTime=${encodeURIComponent(startDateTime)}`);
        queryParams.push(`endDateTime=${encodeURIComponent(endDateTime)}`);
      } else {
        if (startDateTime || endDateTime) {
          let dateFilter = '';
          if (startDateTime) {
            dateFilter += `start/dateTime ge '${startDateTime}'`;
          }
          if (endDateTime) {
            if (dateFilter) dateFilter += ' and ';
            dateFilter += `end/dateTime le '${endDateTime}'`;
          }

          if (filter) {
            filter = `(${filter}) and (${dateFilter})`;
          } else {
            filter = dateFilter;
          }
        }
      }

      if (filter) {
        queryParams.push(`$filter=${encodeURIComponent(filter)}`);
      }

      if (top) {
        queryParams.push(`$top=${top}`);
      }

      if (orderBy) {
        queryParams.push(`$orderBy=${encodeURIComponent(orderBy)}`);
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
    'get-event',
    {
      eventId: z.string().describe('ID of the event to retrieve'),
      calendarId: z
        .string()
        .optional()
        .describe('ID of the calendar (leave empty for default calendar)'),
    },
    async ({ eventId, calendarId }) => {
      const endpoint = calendarId
        ? `/me/calendars/${calendarId}/events/${eventId}`
        : `/me/calendar/events/${eventId}`;

      return graphClient.graphRequest(endpoint, {
        method: 'GET',
      });
    }
  );

  server.tool(
    'create-event',
    {
      subject: z.string().describe('Event subject/title'),
      body: z.string().optional().describe('Event description/body'),
      startDateTime: z
        .string()
        .describe('Start date/time in ISO format (e.g., "2023-04-15T09:00:00")'),
      endDateTime: z.string().describe('End date/time in ISO format (e.g., "2023-04-15T10:00:00")'),
      timeZone: z.string().optional().default('UTC').describe('Time zone for the event'),
      location: z.string().optional().describe('Event location'),
      isAllDay: z.boolean().optional().default(false).describe('Whether this is an all-day event'),
      attendees: z.array(z.string()).optional().describe('Email addresses of attendees'),
      reminderMinutesBeforeStart: z
        .number()
        .optional()
        .describe('Reminder time in minutes before event starts'),
      isOnlineMeeting: z
        .boolean()
        .optional()
        .default(false)
        .describe('Create an online meeting for this event'),
      calendarId: z
        .string()
        .optional()
        .describe('ID of the calendar (leave empty for default calendar)'),
    },
    async ({
      subject,
      body,
      startDateTime,
      endDateTime,
      timeZone,
      location,
      isAllDay,
      attendees,
      reminderMinutesBeforeStart,
      isOnlineMeeting,
      calendarId,
    }) => {
      const event = {
        subject,
        isAllDay,
        start: {
          dateTime: startDateTime,
          timeZone: timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timeZone,
        },
      };

      if (body) {
        event.body = {
          contentType: 'html',
          content: body,
        };
      }

      if (location) {
        event.location = {
          displayName: location,
        };
      }

      if (attendees && attendees.length > 0) {
        event.attendees = attendees.map((email) => ({
          emailAddress: {
            address: email,
          },
          type: 'required',
        }));
      }

      if (reminderMinutesBeforeStart !== undefined) {
        event.reminderMinutesBeforeStart = reminderMinutesBeforeStart;
        event.isReminderOn = true;
      }

      if (isOnlineMeeting) {
        event.isOnlineMeeting = true;
        event.onlineMeetingProvider = 'teamsForBusiness';
      }

      const endpoint = calendarId ? `/me/calendars/${calendarId}/events` : '/me/calendar/events';

      return graphClient.graphRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(event),
      });
    }
  );

  server.tool(
    'update-event',
    {
      eventId: z.string().describe('ID of the event to update'),
      subject: z.string().optional().describe('Updated event subject/title'),
      body: z.string().optional().describe('Updated event description/body'),
      startDateTime: z.string().optional().describe('Updated start date/time in ISO format'),
      endDateTime: z.string().optional().describe('Updated end date/time in ISO format'),
      timeZone: z.string().optional().describe('Updated time zone for the event'),
      location: z.string().optional().describe('Updated event location'),
      isAllDay: z.boolean().optional().describe('Updated all-day flag'),
      calendarId: z
        .string()
        .optional()
        .describe('ID of the calendar (leave empty for default calendar)'),
    },
    async ({
      eventId,
      subject,
      body,
      startDateTime,
      endDateTime,
      timeZone,
      location,
      isAllDay,
      calendarId,
    }) => {
      const eventUpdate = {};

      if (subject !== undefined) {
        eventUpdate.subject = subject;
      }

      if (body !== undefined) {
        eventUpdate.body = {
          contentType: 'html',
          content: body,
        };
      }

      if (startDateTime !== undefined) {
        eventUpdate.start = {
          dateTime: startDateTime,
          timeZone: timeZone || 'UTC',
        };
      }

      if (endDateTime !== undefined) {
        eventUpdate.end = {
          dateTime: endDateTime,
          timeZone: timeZone || 'UTC',
        };
      }

      if (location !== undefined) {
        eventUpdate.location = {
          displayName: location,
        };
      }

      if (isAllDay !== undefined) {
        eventUpdate.isAllDay = isAllDay;
      }

      const endpoint = calendarId
        ? `/me/calendars/${calendarId}/events/${eventId}`
        : `/me/calendar/events/${eventId}`;

      return graphClient.graphRequest(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(eventUpdate),
      });
    }
  );

  server.tool(
    'delete-event',
    {
      eventId: z.string().describe('ID of the event to delete'),
      calendarId: z
        .string()
        .optional()
        .describe('ID of the calendar (leave empty for default calendar)'),
    },
    async ({ eventId, calendarId }) => {
      const endpoint = calendarId
        ? `/me/calendars/${calendarId}/events/${eventId}`
        : `/me/calendar/events/${eventId}`;

      return graphClient.graphRequest(endpoint, {
        method: 'DELETE',
      });
    }
  );

  server.tool(
    'accept-event',
    {
      eventId: z.string().describe('ID of the event to accept'),
      comment: z.string().optional().describe('Optional comment with your response'),
      sendResponse: z
        .boolean()
        .optional()
        .default(true)
        .describe('Send a response to the organizer'),
      calendarId: z
        .string()
        .optional()
        .describe('ID of the calendar (leave empty for default calendar)'),
    },
    async ({ eventId, comment, sendResponse, calendarId }) => {
      const endpoint = calendarId
        ? `/me/calendars/${calendarId}/events/${eventId}/accept`
        : `/me/calendar/events/${eventId}/accept`;

      const body = { sendResponse };
      if (comment) {
        body.comment = comment;
      }

      return graphClient.graphRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }
  );

  server.tool(
    'decline-event',
    {
      eventId: z.string().describe('ID of the event to decline'),
      comment: z.string().optional().describe('Optional comment with your response'),
      sendResponse: z
        .boolean()
        .optional()
        .default(true)
        .describe('Send a response to the organizer'),
      calendarId: z
        .string()
        .optional()
        .describe('ID of the calendar (leave empty for default calendar)'),
    },
    async ({ eventId, comment, sendResponse, calendarId }) => {
      const endpoint = calendarId
        ? `/me/calendars/${calendarId}/events/${eventId}/decline`
        : `/me/calendar/events/${eventId}/decline`;

      const body = { sendResponse };
      if (comment) {
        body.comment = comment;
      }

      return graphClient.graphRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }
  );

  server.tool(
    'find-meeting-times',
    {
      attendees: z.array(z.string()).describe('Email addresses of required attendees'),
      durationMinutes: z.number().default(30).describe('Desired meeting duration in minutes'),
      startDateTime: z.string().describe('Start date/time to search from, in ISO format'),
      endDateTime: z.string().describe('End date/time to search until, in ISO format'),
      timeZone: z.string().optional().default('UTC').describe('Time zone for the meeting'),
      minimumAttendeePercentage: z
        .number()
        .optional()
        .default(100)
        .describe('Minimum percentage of attendees required'),
    },
    async ({
      attendees,
      durationMinutes,
      startDateTime,
      endDateTime,
      timeZone,
      minimumAttendeePercentage,
    }) => {
      const attendeesList = attendees.map((email) => ({
        type: 'required',
        emailAddress: {
          address: email,
        },
      }));

      const meetingTimeRequest = {
        attendees: attendeesList,
        timeConstraint: {
          timeslots: [
            {
              start: {
                dateTime: startDateTime,
                timeZone,
              },
              end: {
                dateTime: endDateTime,
                timeZone,
              },
            },
          ],
        },
        meetingDuration: `PT${durationMinutes}M`,
        returnSuggestionReasons: true,
        minimumAttendeePercentage,
      };

      return graphClient.graphRequest('/me/findMeetingTimes', {
        method: 'POST',
        body: JSON.stringify(meetingTimeRequest),
      });
    }
  );
}
