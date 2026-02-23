import type { Routine } from '@/features/routines';
import type { ProposedCalendarEvent, CalendarTimeRange, RecurrencePattern } from './types';
import { getDatePartsInTimeZone, makeZonedDate } from './timezone';

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
  const timeZone = window.timezone || 'UTC';
  const baseParts = getDatePartsInTimeZone(baseDate, timeZone);
  const baseDay = makeZonedDate(
    {
      year: baseParts.year,
      month: baseParts.month,
      day: baseParts.day
    },
    timeZone
  );

  return routine.timeBlocks.map((block) => {
    const targetWeekday = weekdayOrder[block.day];
    if (typeof targetWeekday === 'undefined') {
      throw new Error(`Unknown weekday: ${block.day}`);
    }
    const offset = (targetWeekday - baseParts.weekdayIndex + 7) % 7;
    const alignedDay = new Date(baseDay.getTime() + offset * 24 * 60 * 60 * 1000);
    const startOffsetMinutes = Math.round(block.startHour * 60);
    const endOffsetMinutes = Math.round(block.endHour * 60);
    const blockStart = new Date(alignedDay.getTime() + startOffsetMinutes * 60 * 1000);
    const blockEnd = new Date(alignedDay.getTime() + endOffsetMinutes * 60 * 1000);

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
