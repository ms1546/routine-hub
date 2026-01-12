import { randomUUID } from 'node:crypto';
import type { CalendarClient } from './client';
import type {
  CalendarEvent,
  CalendarTimeRange,
  ProposedCalendarEvent,
  CalendarInsertResult
} from './types';

type MockCalendarOptions = {
  failingProposals?: string[];
};

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
  private failingProposals: Set<string>;

  constructor(options: MockCalendarOptions = {}) {
    this.failingProposals = new Set(options.failingProposals);
  }

  async listEvents(range: CalendarTimeRange): Promise<CalendarEvent[]> {
    return this.events.filter((event) => event.start >= range.start && event.end <= range.end);
  }

  async insertEvents(events: ProposedCalendarEvent[]): Promise<CalendarInsertResult> {
    const inserted: CalendarEvent[] = [];
    const failures: { proposalId: string; reason: string }[] = [];

    for (const proposal of events) {
      const alreadyExists = this.events.some(
        (existing) => existing.source?.proposalId === proposal.proposalId
      );
      if (alreadyExists) {
        continue;
      }

      if (this.failingProposals.has(proposal.proposalId)) {
        failures.push({ proposalId: proposal.proposalId, reason: 'Mock failure' });
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

    return { success: inserted, failures };
  }

  reset(events: CalendarEvent[] = seedEvents) {
    this.events = [...events];
  }

  setFailingProposals(proposalIds: string[]) {
    this.failingProposals = new Set(proposalIds);
  }
}
