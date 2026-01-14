import { calendar_v3, google } from 'googleapis';
import type { CalendarClient } from './client';
import type {
  CalendarEvent,
  CalendarInsertResult,
  CalendarTimeRange,
  ProposedCalendarEvent
} from './types';
import { getAccessTokenForUser } from '@/infrastructure/auth/oauth-boundary';

const CALENDAR_ID = 'primary';
const PRIVATE_PROP_KEY = 'routinehubProposalId';

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

export class GoogleCalendarClient implements CalendarClient {
  constructor(private readonly userId: string) {}

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

        const response = await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody: {
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
          }
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
      privateExtendedProperty: `${PRIVATE_PROP_KEY}=${proposalId}`,
      maxResults: 1
    });

    return response.data.items?.[0];
  }
}
