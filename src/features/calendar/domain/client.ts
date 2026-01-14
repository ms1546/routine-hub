import type {
  CalendarEvent,
  CalendarTimeRange,
  ProposedCalendarEvent,
  CalendarInsertResult
} from './types';
import { MockCalendarClient } from './mock-client';
import { GoogleCalendarClient } from './google-client';

export interface CalendarClient {
  listEvents(range: CalendarTimeRange): Promise<CalendarEvent[]>;
  insertEvents(events: ProposedCalendarEvent[]): Promise<CalendarInsertResult>;
}

let overrideClient: CalendarClient | null = null;

export function getCalendarClient(userId?: string): CalendarClient {
  if (overrideClient) {
    return overrideClient;
  }

  const provider = process.env.CALENDAR_CLIENT ?? 'mock';
  if (provider === 'google') {
    if (!userId) {
      throw new Error('User id is required when using Google Calendar client');
    }
    return new GoogleCalendarClient(userId);
  }

  return new MockCalendarClient();
}

export function setCalendarClient(client: CalendarClient | null) {
  overrideClient = client;
}
