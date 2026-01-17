'use server';

import { routinesRepository } from '@/features/routines';
import { buildProposedEvents } from '@/features/calendar/domain/proposals';
import { getCalendarClient } from '@/features/calendar/domain/client';
import { createDefaultCalendarWindow } from '@/features/calendar/domain/window';
import type { CalendarEvent, CalendarInsertFailure, RecurrencePattern, CalendarTimeRange } from '@/features/calendar/domain/types';

export type CalendarConfirmationResult = {
  successCount: number;
  failureCount: number;
  insertedEvents: CalendarEvent[];
  failedEvents: CalendarInsertFailure[];
};

export async function getCalendarPreviewAction({
  routineId,
  startDate,
  endDate,
  recurrence
}: {
  routineId: string;
  startDate: string;
  endDate: string;
  recurrence?: RecurrencePattern;
}): Promise<{ proposedEvents: any[]; existingEvents: CalendarEvent[] }> {
  const { getCurrentUser } = await import('@/infrastructure/auth/session');
  const currentUser = await getCurrentUser();
  const routine = await routinesRepository.get(routineId, currentUser.id);
  if (!routine) {
    throw new Error('Routine not found');
  }

  const calendarWindow: CalendarTimeRange = {
    start: new Date(startDate).toISOString(),
    end: new Date(endDate).toISOString(),
    timezone: 'Asia/Tokyo'
  };

  const proposedEvents = buildProposedEvents(routine, calendarWindow, recurrence);
  const client = getCalendarClient(routine.owner);
  const existingEvents = await client.listEvents(calendarWindow);

  return { proposedEvents, existingEvents };
}

export async function confirmProposedEventsAction({
  routineId,
  proposalIds,
  recurrence
}: {
  routineId: string;
  proposalIds: string[];
  recurrence?: RecurrencePattern;
}): Promise<CalendarConfirmationResult> {
  const { getCurrentUser } = await import('@/infrastructure/auth/session');
  const currentUser = await getCurrentUser();
  const routine = await routinesRepository.get(routineId, currentUser.id);
  if (!routine) {
    throw new Error('Routine not found');
  }

  const calendarWindow = createDefaultCalendarWindow();
  const proposals = buildProposedEvents(routine, calendarWindow, recurrence).filter((proposal) =>
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
