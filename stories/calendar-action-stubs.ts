/**
 * Storybook用のモック: Calendar Server Actions
 * StorybookではServer Actionsが動作しないため、モックに置き換える
 */

import type { ProposedCalendarEvent, CalendarEvent, RecurrencePattern } from '@/features/calendar/domain/types';
import type { CalendarConfirmationResult } from '@/app/actions/calendar';
import type { CalendarCustomizationResult } from '@/app/actions/calendar-customization';

/**
 * Mock implementation of getCalendarPreviewAction
 */
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
}): Promise<{ proposedEvents: ProposedCalendarEvent[]; existingEvents: CalendarEvent[] }> {
  console.log('[Storybook Mock] getCalendarPreviewAction called:', { routineId, startDate, endDate, recurrence });

  // Return mock data
  return {
    proposedEvents: [
      {
        proposalId: 'mock-proposal-1',
        title: 'Mock Routine Event',
        description: 'This is a mock event for Storybook',
        start: `${startDate}T09:00:00+09:00`,
        end: `${startDate}T10:00:00+09:00`,
        routineId,
        blockId: 'mock-block-1',
        status: 'pending'
      }
    ],
    existingEvents: []
  };
}

/**
 * Mock implementation of confirmProposedEventsAction
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
  console.log('[Storybook Mock] confirmProposedEventsAction called:', { routineId, proposalIds, recurrence });

  // Return mock success result
  return {
    successCount: proposalIds.length,
    failureCount: 0,
    insertedEvents: proposalIds.map((id) => ({
      id: `mock-event-${id}`,
      title: 'Mock Calendar Event',
      description: 'This is a mock calendar event for Storybook',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      routineId,
      blockId: 'mock-block-1'
    })),
    failedEvents: []
  };
}

/**
 * Mock implementation of customizeCalendarEventsAction
 */
export async function customizeCalendarEventsAction({
  proposedEvents,
  existingEvents,
  routineId
}: {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  routineId?: string;
}): Promise<CalendarCustomizationResult> {
  console.log('[Storybook Mock] customizeCalendarEventsAction called:', { proposedEvents, existingEvents, routineId });

  // Return mock customization result
  return {
    customizedEvents: proposedEvents.map((event) => ({
      proposalId: event.proposalId,
      reasoning: 'Storybook mock customization - no actual AI processing performed'
    })),
    suggestions: []
  };
}
