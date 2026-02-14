'use server';

import { routinesRepository } from '@/features/routines';
import { buildProposedEvents } from '@/features/calendar/domain/proposals';
import { getCalendarClient } from '@/infrastructure/calendar/calendar-client-factory';
import { hasStoredRefreshToken } from '@/infrastructure/auth/oauth-boundary';
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
  const routine = await routinesRepository.get(routineId, currentUser.id, currentUser.email);
  if (!routine) {
    throw new Error('Routine not found');
  }

  const calendarWindow: CalendarTimeRange = {
    start: new Date(startDate).toISOString(),
    end: new Date(endDate).toISOString(),
    timezone: 'Asia/Tokyo'
  };

  const proposedEvents = buildProposedEvents(routine, calendarWindow, recurrence);
  const isConnected = await hasStoredRefreshToken(routine.owner);
  const existingEvents = isConnected
    ? await getCalendarClient(routine.owner).listEvents(calendarWindow)
    : [];

  return { proposedEvents, existingEvents, isCalendarConnected: isConnected };
}

/**
 * Confirm Proposed Events Action (Calendar Write)
 *
 * PORTFOLIO MODE RESTRICTION:
 * - Calendar writes are ADMIN-ONLY in portfolio mode
 * - This is intentional to avoid requiring reviewers to grant sensitive calendar scopes
 * - Reduces operational and security complexity
 * - Keeps the demo focused on design, not automation
 *
 * Authorization:
 * - Server-side check: Only admin users can write to Google Calendar
 * - Regular users receive a clear error message
 *
 * OAuth Design:
 * - Each calendar write must be explicitly initiated by the user
 * - OAuth consent with calendar.events scope is requested EACH TIME
 * - No refresh tokens are stored (portfolio security tradeoff)
 * - Short-lived access tokens are obtained and discarded immediately
 * - prompt=consent is used to ensure explicit user intent per write
 */
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

  // PORTFOLIO MODE: Calendar writes are admin-only
  // This restriction is intentional for portfolio context:
  // - Avoids requiring reviewers to grant sensitive calendar scopes
  // - Reduces operational complexity
  // - Keeps demo focused on design rather than automation
  if (currentUser.role !== 'admin') {
    throw new Error(
      'Calendar export is currently limited to admin users in portfolio mode. ' +
      'This is an intentional design decision to avoid requiring sensitive calendar permissions from reviewers.'
    );
  }

  const routine = await routinesRepository.get(routineId, currentUser.id, currentUser.email);
  if (!routine) {
    throw new Error('Routine not found');
  }

  const calendarWindow = createDefaultCalendarWindow();
  const proposals = buildProposedEvents(routine, calendarWindow, recurrence).filter((proposal) =>
    proposalIds.includes(proposal.proposalId)
  );

  const isConnected = await hasStoredRefreshToken(routine.owner);
  if (!isConnected) {
    throw new Error('Google Calendarの接続が必要です。先に「Connect Calendar」を実行してください。');
  }
  const client = getCalendarClient(routine.owner);
  const result = await client.insertEvents(proposals);
  return {
    successCount: result.success.length,
    failureCount: result.failures.length,
    insertedEvents: result.success,
    failedEvents: result.failures
  };
}
