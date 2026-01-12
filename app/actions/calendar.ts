'use server';

import { routinesRepository } from '@/lib/routines';
import { buildProposedEvents } from '@/lib/calendar/proposals';
import { getCalendarClient } from '@/lib/calendar/client';
import { createDefaultCalendarWindow } from '@/lib/calendar/window';
import type { CalendarEvent, CalendarInsertFailure } from '@/lib/calendar/types';

export type CalendarConfirmationResult = {
  successCount: number;
  failureCount: number;
  insertedEvents: CalendarEvent[];
  failedEvents: CalendarInsertFailure[];
};

export async function confirmProposedEventsAction({
  routineId,
  proposalIds
}: {
  routineId: string;
  proposalIds: string[];
}): Promise<CalendarConfirmationResult> {
  const routine = await routinesRepository.get(routineId);
  if (!routine) {
    throw new Error('Routine not found');
  }

  const calendarWindow = createDefaultCalendarWindow();
  const proposals = buildProposedEvents(routine, calendarWindow).filter((proposal) =>
    proposalIds.includes(proposal.proposalId)
  );

  const client = getCalendarClient(routine.owner);
  const result = await client.insertEvents(proposals);
  return {
    successCount: result.success.length,
    failureCount: result.failures.length,
    insertedEvents: result.success,
    failedEvents: result.failures
  };
}
