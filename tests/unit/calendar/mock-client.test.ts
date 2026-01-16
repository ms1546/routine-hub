import { describe, it, expect } from 'vitest';
import { MockCalendarClient } from '@/features/calendar/domain/mock-client';
import type { ProposedCalendarEvent } from '@/features/calendar/domain/types';

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

const proposalWithRecurrence: ProposedCalendarEvent = {
  ...proposal,
  proposalId: 'proposal-2',
  recurrence: { type: 'weekly', interval: 1 }
};

describe('MockCalendarClient', () => {
  it('inserts events idempotently based on proposal id', async () => {
    const client = new MockCalendarClient();
    client.reset([]);

    const first = await client.insertEvents([proposal]);
    const second = await client.insertEvents([proposal]);

    expect(first.success).toHaveLength(1);
    expect(first.failures).toHaveLength(0);
    expect(second.success).toHaveLength(0);
    expect(second.failures).toHaveLength(0);

    const events = await client.listEvents({
      start: '2025-02-01T00:00:00.000Z',
      end: '2025-02-02T00:00:00.000Z',
      timezone: 'UTC'
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toBeDefined();
    expect(events[0]?.source?.proposalId).toBe('proposal-1');
  });

  it('records partial failures without duplicating events', async () => {
    const client = new MockCalendarClient({ failingProposals: ['proposal-2'] });
    client.reset([]);

    const result = await client.insertEvents([
      proposal,
      { ...proposal, proposalId: 'proposal-2' }
    ]);

    expect(result.success).toHaveLength(1);
    expect(result.failures).toEqual([{ proposalId: 'proposal-2', reason: 'Mock failure' }]);

    const retry = await client.insertEvents([{ ...proposal, proposalId: 'proposal-2' }]);
    expect(retry.success).toHaveLength(0);
    expect(retry.failures).toEqual([{ proposalId: 'proposal-2', reason: 'Mock failure' }]);
  });

  it('handles events with recurrence pattern', async () => {
    const client = new MockCalendarClient();
    client.reset([]);

    const result = await client.insertEvents([proposalWithRecurrence]);

    expect(result.success).toHaveLength(1);
    expect(result.failures).toHaveLength(0);
    expect(result.success[0]?.source?.proposalId).toBe('proposal-2');
  });
});
