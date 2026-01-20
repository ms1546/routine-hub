/**
 * Google Calendar Client Implementation (Node.js only)
 *
 * This file contains the Node.js-specific implementation using googleapis.
 * It should NEVER be imported in browser contexts (Storybook, client components, etc.)
 *
 * Clean Architecture: This is an infrastructure adapter that implements
 * the CalendarClient interface from the domain layer.
 */

import { calendar_v3, google } from 'googleapis';
import type { CalendarClient } from '@/features/calendar/domain/client';
import type {
  CalendarEvent,
  CalendarInsertResult,
  CalendarTimeRange,
  ProposedCalendarEvent
} from '@/features/calendar/domain/types';
import { getAccessTokenForUser } from '@/infrastructure/auth/oauth-boundary';

const CALENDAR_ID = 'primary';
const PRIVATE_PROP_KEY = 'routinehubProposalId';

/**
 * RecurrencePatternからGoogle CalendarのRRULE文字列を生成
 */
function buildRRULE(
  pattern: { type: 'none' } | { type: 'weekly'; interval?: number } | { type: 'monthly'; interval?: number },
  endDate: string
): string | undefined {
  if (pattern.type === 'none') {
    return undefined;
  }

  const endDateObj = new Date(endDate);
  endDateObj.setHours(23, 59, 59, 999); // 終了日の最後まで

  if (pattern.type === 'weekly') {
    const interval = pattern.interval ?? 1;
    const until = endDateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `FREQ=WEEKLY;INTERVAL=${interval};UNTIL=${until}`;
  }

  if (pattern.type === 'monthly') {
    const interval = pattern.interval ?? 1;
    const until = endDateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `FREQ=MONTHLY;INTERVAL=${interval};UNTIL=${until}`;
  }

  return undefined;
}

export function mapGoogleEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  return {
    id: event.id ?? '',
    title: event.summary ?? 'Untitled event',
    description: event.description ?? undefined,
    start: event.start?.dateTime ?? event.start?.date ?? '',
    end: event.end?.dateTime ?? event.end?.date ?? '',
    source: event.extendedProperties?.private
      ? {
          routineId: event.extendedProperties.private.routineId,
          blockId: event.extendedProperties.private.blockId,
          proposalId: event.extendedProperties.private[PRIVATE_PROP_KEY]
        }
      : undefined
  };
}

/**
 * Google Calendar Client
 *
 * Implements CalendarClient interface for Google Calendar integration.
 *
 * OAuth Design (Portfolio Mode):
 * - Calendar writes are ADMIN-ONLY (enforced server-side)
 * - Access tokens are obtained per request via getAccessTokenForUser()
 * - Refresh tokens are NOT stored (portfolio security tradeoff)
 * - Each calendar write requires explicit OAuth consent
 * - prompt=consent is used to ensure explicit user intent per write
 * - Short-lived access tokens are obtained and discarded immediately
 *
 * This is an intentional design for portfolio context:
 * - Avoids requiring reviewers to grant sensitive calendar scopes
 * - Reduces operational complexity
 * - Keeps demo focused on design, not automation
 *
 * Production considerations:
 * - Refresh token storage would be required for offline access
 * - AWS Secrets Manager or similar could be used for credential storage
 * - Background jobs could sync calendar events automatically
 * - These are explicitly NOT implemented for portfolio simplicity
 */
export class GoogleCalendarClient implements CalendarClient {
  constructor(private readonly userId: string) {}

  /**
   * Get Google Calendar API client instance
   *
   * Retrieves a short-lived access token for the user and initializes
   * the Google Calendar API client. The access token is obtained via
   * getAccessTokenForUser(), which may trigger OAuth consent if needed.
   *
   * Note: In portfolio mode, refresh tokens are NOT stored.
   * Each request may require explicit user consent.
   */
  private async getCalendar(): Promise<calendar_v3.Calendar> {
    const { accessToken } = await getAccessTokenForUser(this.userId);
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    google.options({ auth: oauth2Client });
    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async listEvents(range: CalendarTimeRange): Promise<CalendarEvent[]> {
    const calendar = await this.getCalendar();
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: range.start,
      timeMax: range.end,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const items = response.data.items ?? [];
    return items
      .filter((event): event is calendar_v3.Schema$Event => event !== undefined)
      .map((event) => mapGoogleEvent(event));
  }

  async insertEvents(events: ProposedCalendarEvent[]): Promise<CalendarInsertResult> {
    const calendar = await this.getCalendar();
    const inserted: CalendarEvent[] = [];
    const failures: { proposalId: string; reason: string }[] = [];

    for (const event of events) {
      try {
        const exists = await this.findEventByProposal(event.proposalId, calendar);
        if (exists) {
          continue;
        }

        const startDateStr = new Date(event.start).toISOString().split('T')[0];
        const recurrence = event.recurrence && startDateStr
          ? buildRRULE(event.recurrence, startDateStr)
          : undefined;

        const requestBody: calendar_v3.Schema$Event = {
          summary: event.title,
          description: event.description,
          start: { dateTime: event.start },
          end: { dateTime: event.end },
          extendedProperties: {
            private: {
              [PRIVATE_PROP_KEY]: event.proposalId,
              routineId: event.routineId,
              blockId: event.blockId
            }
          }
        };

        if (recurrence) {
          requestBody.recurrence = [recurrence];
        }

        const response = await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody
        });

        if (response.data.id) {
          inserted.push({
            id: response.data.id,
            title: response.data.summary ?? event.title,
            description: response.data.description ?? event.description,
            start: response.data.start?.dateTime ?? event.start,
            end: response.data.end?.dateTime ?? event.end,
            source: {
              routineId: event.routineId,
              blockId: event.blockId,
              proposalId: event.proposalId
            }
          });
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        failures.push({ proposalId: event.proposalId, reason });
      }
    }

    return { success: inserted, failures };
  }

  private async findEventByProposal(proposalId: string, calendar: calendar_v3.Calendar) {
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      privateExtendedProperty: [`${PRIVATE_PROP_KEY}=${proposalId}`], // API expects string[]
      maxResults: 1
    });

    return response.data.items?.[0];
  }
}
