import type { CalendarTimeRange } from './types';

export function createDefaultCalendarWindow(): CalendarTimeRange {
  const start = new Date();
  const end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    timezone: 'UTC'
  };
}
