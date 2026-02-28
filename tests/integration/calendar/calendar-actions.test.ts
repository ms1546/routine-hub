import { describe, expect, it, beforeEach } from 'vitest';
import { confirmProposedEventsAction } from '@/app/actions/calendar';
import { setCalendarClient } from '@/infrastructure/calendar/calendar-client-factory';
import { MockCalendarClient } from '@/features/calendar/domain/mock-client';
import { routinesRepository } from '@/features/routines';
import { buildProposedEvents } from '@/features/calendar/domain/proposals';
import type { CalendarTimeRange } from '@/features/calendar/domain/types';

/** 月曜を含む固定ウィンドウ（weekly ルーチンのテストで安定して1件以上得るため） */
function createFixedWindowWithMonday(): CalendarTimeRange {
  return {
    start: '2025-02-03T00:00:00.000Z',
    end: '2025-02-10T00:00:00.000Z',
    timezone: 'UTC'
  };
}

let proposalId: string;
let routineId: string;

beforeEach(async () => {
  process.env.MOCK_USER_EMAIL = 'routunehub.dev@gmail.com';
  const client = new MockCalendarClient();
  client.reset([]);
  setCalendarClient(client);

  const routine = await routinesRepository.create({
    name: 'Calendar Seed',
    description: 'Seed routine for calendar action tests.',
    purpose: 'Ensure routine exists for calendar actions.',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['seed'],
    owner: 'account-ops',
    timeBlocks: [
      {
        day: 'monday',
        startHour: 9,
        endHour: 12,
        label: 'Seed Block',
        objective: 'Seed objective',
        energyLevel: 'medium'
      }
    ]
  });
  routineId = routine.id;
  const proposals = buildProposedEvents(routine, createFixedWindowWithMonday());
  proposalId = proposals[0]?.proposalId ?? '';
});

describe('confirmProposedEventsAction', () => {
  it('inserts events once per proposal id', async () => {
    if (!proposalId) throw new Error('Missing proposal id in test setup');
    const firstInsert = await confirmProposedEventsAction({
      routineId,
      proposalIds: [proposalId],
      startDate: '2025-02-03',
      endDate: '2025-02-10'
    });

    expect(firstInsert.successCount).toBe(1);
    expect(firstInsert.failureCount).toBe(0);

    const secondInsert = await confirmProposedEventsAction({
      routineId,
      proposalIds: [proposalId],
      startDate: '2025-02-03',
      endDate: '2025-02-10'
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
      routineId,
      proposalIds: [proposalId],
      startDate: '2025-02-03',
      endDate: '2025-02-10'
    });

    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(1);
    expect(result.failedEvents[0]?.proposalId).toBe(proposalId);
  });

  it('handles recurrence pattern in proposals', async () => {
    const routine = await routinesRepository.get(routineId, undefined);
    if (!routine) throw new Error('Seed routine missing');
    const proposals = buildProposedEvents(routine, createFixedWindowWithMonday(), {
      type: 'weekly',
      interval: 1
    });
    const proposalIdWithRecurrence = proposals[0]?.proposalId ?? '';

    const result = await confirmProposedEventsAction({
      routineId,
      proposalIds: [proposalIdWithRecurrence],
      startDate: '2025-02-03',
      endDate: '2025-02-10',
      recurrence: { type: 'weekly', interval: 1 }
    });

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
  });
});
