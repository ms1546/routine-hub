// Storybook用のモック: calendar-customizationアクション
import type { CalendarCustomizationResult } from '@/app/actions/calendar-customization';
import type { ProposedCalendarEvent } from '@/features/calendar/domain/types';

export async function customizeCalendarEventsAction({
  proposedEvents,
  existingEvents,
  routineId
}: {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: any[];
  routineId?: string;
}): Promise<CalendarCustomizationResult> {
  // Storybookではモックデータを返す
  return {
    customizedEvents: proposedEvents.map((event) => ({
      proposalId: event.proposalId,
      reasoning: 'Storybookモック: カスタマイズなしで元のイベントをそのまま使用します。'
    })),
    suggestions: []
  };
}

export type { CalendarCustomizationResult };
