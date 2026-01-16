import type { Routine } from '@/features/routines';
import type { ProposedCalendarEvent, CalendarTimeRange, RecurrencePattern } from './types';

const weekdayOrder: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

export function buildProposedEvents(
  routine: Routine,
  window: CalendarTimeRange,
  recurrence?: RecurrencePattern
): ProposedCalendarEvent[] {
  const baseDate = new Date(window.start);

  return routine.timeBlocks.map((block) => {
    const targetWeekday = weekdayOrder[block.day];
    if (typeof targetWeekday === 'undefined') {
      throw new Error(`Unknown weekday: ${block.day}`);
    }
    const startDate = alignDate(baseDate, targetWeekday);
    const blockStart = setHoursUtc(startDate, block.startHour);
    const blockEnd = setHoursUtc(startDate, block.endHour);

    return {
      proposalId: `${routine.id}-${block.id}`,
      routineId: routine.id,
      blockId: block.id,
      title: `${routine.name} · ${block.label}`,
      description: block.objective,
      start: blockStart.toISOString(),
      end: blockEnd.toISOString(),
      status: 'pending',
      recurrence
    };
  });
}

function alignDate(baseDate: Date, targetWeekday: number) {
  const cloned = new Date(baseDate);
  const baseWeekday = cloned.getUTCDay();
  const offset = (targetWeekday - baseWeekday + 7) % 7;
  cloned.setUTCDate(cloned.getUTCDate() + offset);
  return cloned;
}

function setHoursUtc(date: Date, hour: number) {
  const cloned = new Date(date);
  cloned.setUTCHours(hour, 0, 0, 0);
  return cloned;
}
