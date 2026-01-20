// Storybook用のモック: calendarアクション
import type { CalendarConfirmationResult } from '@/app/actions/calendar';
import type { RecurrencePattern } from '@/features/calendar/domain/types';

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
}): Promise<{ proposedEvents: any[]; existingEvents: any[] }> {
  // Storybookではモックデータを返す
  return {
    proposedEvents: [],
    existingEvents: []
  };
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
  // Storybookではモックデータを返す
  return {
    successCount: 0,
    failureCount: 0,
    insertedEvents: [],
    failedEvents: []
  };
}

export type { CalendarConfirmationResult };
