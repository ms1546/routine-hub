'use server';

import { routinesRepository } from '@/lib/routines';
import { buildProposedEvents } from '@/lib/calendar/proposals';
import { getCalendarClient } from '@/lib/calendar/client';
import { createDefaultCalendarWindow } from '@/lib/calendar/window';
import type { CalendarEvent } from '@/lib/calendar/types';

export async function confirmProposedEventsAction({
  routineId,
  proposalIds
}: {
  routineId: string;
  proposalIds: string[];
}): Promise<CalendarEvent[]> {
  const routine = await routinesRepository.get(routineId);
  if (!routine) {
    throw new Error('Routine not found');
  }

  const calendarWindow = createDefaultCalendarWindow();
  const proposals = buildProposedEvents(routine, calendarWindow).filter((proposal) =>
    proposalIds.includes(proposal.proposalId)
  );

  const client = getCalendarClient();
  const inserted = await client.insertEvents(proposals);
  return inserted;
}
