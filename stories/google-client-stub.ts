// Storybook用のモック: google-client
// googleapisを使用するため、モックに置き換える

import type { CalendarClient, CalendarEvent, CalendarInsertResult, CalendarTimeRange, ProposedCalendarEvent } from '@/features/calendar/domain/types';

export class GoogleCalendarClient implements CalendarClient {
  constructor(private readonly userId: string) {}

  async listEvents(_range: CalendarTimeRange): Promise<CalendarEvent[]> {
    return [];
  }

  async insertEvents(_events: ProposedCalendarEvent[]): Promise<CalendarInsertResult> {
    return {
      success: _events.map((e) => ({
        id: `mock-${e.proposalId}`,
        title: e.title,
        description: e.description,
        start: e.start,
        end: e.end,
        source: {
          routineId: e.routineId,
          blockId: e.blockId,
          proposalId: e.proposalId
        }
      })),
      failures: []
    };
  }
}

export function mapGoogleEvent(_event: any): CalendarEvent {
  return {
    id: 'mock-event-id',
    title: 'Mock Event',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 3600_000).toISOString()
  };
}
