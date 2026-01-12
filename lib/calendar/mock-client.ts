import { randomUUID } from 'node:crypto';
import type { CalendarClient } from './client';
import type { CalendarEvent, CalendarTimeRange, ProposedCalendarEvent } from './types';

const seedEvents: CalendarEvent[] = [
  {
    id: 'seed-1',
    title: '朝活ラン',
    description: '近所のランニングコースで 5km',
    start: '2025-02-01T06:00:00.000Z',
    end: '2025-02-01T07:00:00.000Z'
  },
  {
    id: 'seed-2',
    title: 'プロダクト定例',
    description: '毎週火曜 10:00 の戦略定例',
    start: '2025-02-04T01:00:00.000Z',
    end: '2025-02-04T02:00:00.000Z'
  }
];

export class MockCalendarClient implements CalendarClient {
  private events: CalendarEvent[] = [...seedEvents];

  async listEvents(range: CalendarTimeRange): Promise<CalendarEvent[]> {
    return this.events.filter((event) => event.start >= range.start && event.end <= range.end);
  }

  async insertEvents(events: ProposedCalendarEvent[]): Promise<CalendarEvent[]> {
    const inserted: CalendarEvent[] = [];

    for (const proposal of events) {
      const alreadyExists = this.events.some(
        (existing) => existing.source?.proposalId === proposal.proposalId
      );
      if (alreadyExists) {
        continue;
      }

      const event: CalendarEvent = {
        id: randomUUID(),
        title: proposal.title,
        description: proposal.description,
        start: proposal.start,
        end: proposal.end,
        source: {
          routineId: proposal.routineId,
          blockId: proposal.blockId,
          proposalId: proposal.proposalId
        }
      };

      this.events.push(event);
      inserted.push(event);
    }

    return inserted;
  }

  reset(events: CalendarEvent[] = seedEvents) {
    this.events = [...events];
  }
}
