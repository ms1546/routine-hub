import { describe, expect, it, beforeEach } from 'vitest';
import { confirmProposedEventsAction } from '@/app/actions/calendar';
import { setCalendarClient } from '@/lib/calendar/client';
import { MockCalendarClient } from '@/lib/calendar/mock-client';
import { routinesRepository } from '@/lib/routines';
import { buildProposedEvents } from '@/lib/calendar/proposals';
import { createDefaultCalendarWindow } from '@/lib/calendar/window';

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

    expect(firstInsert).toHaveLength(1);

    const secondInsert = await confirmProposedEventsAction({
      routineId: '11111111-1111-4111-8111-111111111111',
      proposalIds: [proposalId]
    });

    expect(secondInsert).toHaveLength(0);
  });
});
