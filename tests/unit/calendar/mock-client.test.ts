import { describe, it, expect } from 'vitest';
import { MockCalendarClient } from '@/lib/calendar/mock-client';
import type { ProposedCalendarEvent } from '@/lib/calendar/types';

const proposal: ProposedCalendarEvent = {
  proposalId: 'proposal-1',
  routineId: 'routine-1',
  blockId: 'block-1',
  title: '集中ブロック',
  description: '資料作成',
  start: '2025-02-01T09:00:00.000Z',
  end: '2025-02-01T12:00:00.000Z',
  status: 'pending'
};

describe('MockCalendarClient', () => {
  it('inserts events idempotently based on proposal id', async () => {
    const client = new MockCalendarClient();
    client.reset([]);

    const first = await client.insertEvents([proposal]);
    const second = await client.insertEvents([proposal]);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);

    const events = await client.listEvents({
      start: '2025-02-01T00:00:00.000Z',
      end: '2025-02-02T00:00:00.000Z',
      timezone: 'UTC'
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toBeDefined();
    expect(events[0]?.source?.proposalId).toBe('proposal-1');
  });
});
