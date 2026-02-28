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

/** ウィンドウの開始・終了をタイムゾーン付きで日付部分のみ取得（その日の0時） */
function parseWindowDates(window: CalendarTimeRange): { startDate: Date; endDate: Date } {
  const timeZone = window.timezone || 'UTC';
  const start = new Date(window.start);
  const end = new Date(window.end);
  const startParts = getDatePartsInTimeZone(start, timeZone);
  const endParts = getDatePartsInTimeZone(end, timeZone);
  const startDate = makeZonedDate(
    { year: startParts.year, month: startParts.month, day: startParts.day },
    timeZone
  );
  const endDate = makeZonedDate(
    { year: endParts.year, month: endParts.month, day: endParts.day },
    timeZone
  );
  return { startDate, endDate };
}

/** start から end まで1日ずつ進めた日付を yield */
function* iterateDays(startDate: Date, endDate: Date, timeZone: string): Generator<{ year: number; month: number; day: number; weekdayIndex: number }> {
  const current = new Date(startDate.getTime());
  const endTime = endDate.getTime();
  while (current.getTime() <= endTime) {
    const parts = getDatePartsInTimeZone(current, timeZone);
    yield { year: parts.year, month: parts.month, day: parts.day, weekdayIndex: parts.weekdayIndex };
    current.setDate(current.getDate() + 1);
  }
}

/**
 * 選択した期間に、durationType に応じてカレンダーイベントを生成する。
 * - weekly: 期間内の「週ごと」に適用（各曜日のブロックを毎週1回ずつ）
 * - normal: 期間内の「日ごと」に適用（同じ時間ブロックを毎日）
 */
export function buildProposedEvents(
  routine: Routine,
  window: CalendarTimeRange,
  recurrence?: RecurrencePattern
): ProposedCalendarEvent[] {
  const timeZone = window.timezone || 'UTC';
  const { startDate, endDate } = parseWindowDates(window);
  const events: ProposedCalendarEvent[] = [];

  if (routine.durationType === 'normal') {
    // 日毎: 期間内の毎日、全ブロックをその日の startHour/endHour で作成
    for (const { year, month, day } of iterateDays(startDate, endDate, timeZone)) {
      const dayStart = makeZonedDate({ year, month, day }, timeZone);
      for (const block of routine.timeBlocks) {
        const startOffsetMinutes = Math.round(block.startHour * 60);
        const endOffsetMinutes = Math.round(block.endHour * 60);
        const blockStart = new Date(dayStart.getTime() + startOffsetMinutes * 60 * 1000);
        const blockEnd = new Date(dayStart.getTime() + endOffsetMinutes * 60 * 1000);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        events.push({
          proposalId: `${routine.id}-${block.id}-${dateStr}`,
          routineId: routine.id,
          blockId: block.id,
          title: `${routine.name} · ${block.label}`,
          description: block.objective,
          start: blockStart.toISOString(),
          end: blockEnd.toISOString(),
          status: 'pending',
          recurrence
        });
      }
    }
    return events;
  }

  // weekly: 期間内の各日について、その曜日のブロックのみ作成
  for (const { year, month, day, weekdayIndex } of iterateDays(startDate, endDate, timeZone)) {
    for (const block of routine.timeBlocks) {
      const targetWeekday = weekdayOrder[block.day];
      if (typeof targetWeekday === 'undefined') {
        throw new Error(`Unknown weekday: ${block.day}`);
      }
      if (targetWeekday !== weekdayIndex) continue;

      const dayStart = makeZonedDate({ year, month, day }, timeZone);
      const startOffsetMinutes = Math.round(block.startHour * 60);
      const endOffsetMinutes = Math.round(block.endHour * 60);
      const blockStart = new Date(dayStart.getTime() + startOffsetMinutes * 60 * 1000);
      const blockEnd = new Date(dayStart.getTime() + endOffsetMinutes * 60 * 1000);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      events.push({
        proposalId: `${routine.id}-${block.id}-${dateStr}`,
        routineId: routine.id,
        blockId: block.id,
        title: `${routine.name} · ${block.label}`,
        description: block.objective,
        start: blockStart.toISOString(),
        end: blockEnd.toISOString(),
        status: 'pending',
        recurrence
      });
    }
  }

  return events;
}
