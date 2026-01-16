import { describe, expect, it, beforeEach } from 'vitest';
import { confirmProposedEventsAction } from '@/app/actions/calendar';
import { setCalendarClient } from '@/features/calendar/domain/client';
import { MockCalendarClient } from '@/features/calendar/domain/mock-client';
import { routinesRepository } from '@/features/routines';
import { buildProposedEvents } from '@/features/calendar/domain/proposals';
import { createDefaultCalendarWindow } from '@/features/calendar/domain/window';

let proposalId: string;

beforeEach(async () => {
  const client = new MockCalendarClient();
  client.reset([]);
  setCalendarClient(client);

  const routine = await routinesRepository.get('11111111-1111-4111-8111-111111111111');
  if (!routine) throw new Error('Seed routine missing');
  const proposals = buildProposedEvents(routine, createDefaultCalendarWindow());
  proposalId = proposals[0]?.proposalId ?? '';
});

describe('confirmProposedEventsAction', () => {
  it('inserts events once per proposal id', async () => {
    if (!proposalId) throw new Error('Missing proposal id in test setup');
    const firstInsert = await confirmProposedEventsAction({
      routineId: '11111111-1111-4111-8111-111111111111',
      proposalIds: [proposalId]
    });

    expect(firstInsert.successCount).toBe(1);
    expect(firstInsert.failureCount).toBe(0);

    const secondInsert = await confirmProposedEventsAction({
      routineId: '11111111-1111-4111-8111-111111111111',
      proposalIds: [proposalId]
    });

    expect(secondInsert.successCount).toBe(0);
    expect(secondInsert.failureCount).toBe(0);
  });

  it('returns failure details when calendar client rejects events', async () => {
    const client = new MockCalendarClient();
    client.reset([]);
    client.setFailingProposals([proposalId]);
    setCalendarClient(client);

    const result = await confirmProposedEventsAction({
      routineId: '11111111-1111-4111-8111-111111111111',
      proposalIds: [proposalId]
    });

    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(1);
    expect(result.failedEvents[0]?.proposalId).toBe(proposalId);
  });

  it('handles recurrence pattern in proposals', async () => {
    const routine = await routinesRepository.get('11111111-1111-4111-8111-111111111111');
    if (!routine) throw new Error('Seed routine missing');
    const proposals = buildProposedEvents(routine, createDefaultCalendarWindow(), {
      type: 'weekly',
      interval: 1
    });
    const proposalIdWithRecurrence = proposals[0]?.proposalId ?? '';

    const result = await confirmProposedEventsAction({
      routineId: '11111111-1111-4111-8111-111111111111',
      proposalIds: [proposalIdWithRecurrence],
      recurrence: { type: 'weekly', interval: 1 }
    });

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
  });
});
