import type { CalendarEvent, CalendarTimeRange, ProposedCalendarEvent } from './types';
import { MockCalendarClient } from './mock-client';

export interface CalendarClient {
  listEvents(range: CalendarTimeRange): Promise<CalendarEvent[]>;
  insertEvents(events: ProposedCalendarEvent[]): Promise<CalendarEvent[]>;
}

let singletonClient: CalendarClient | null = null;

export function getCalendarClient(): CalendarClient {
  if (!singletonClient) {
    singletonClient = new MockCalendarClient();
  }
  return singletonClient;
}

export function setCalendarClient(client: CalendarClient | null) {
  singletonClient = client;
}
