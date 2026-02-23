type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekdayIndex: number;
};

const weekdayIndexByShortName: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

const getFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

export const getDatePartsInTimeZone = (date: Date, timeZone: string): ZonedDateParts => {
  const parts = getFormatter(timeZone).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  const weekday = map.get('weekday') ?? 'Sun';
  return {
    year: Number(map.get('year')),
    month: Number(map.get('month')),
    day: Number(map.get('day')),
    hour: Number(map.get('hour')),
    minute: Number(map.get('minute')),
    second: Number(map.get('second')),
    weekdayIndex: weekdayIndexByShortName[weekday] ?? 0
  };
};

export const getTimeZoneOffsetMinutes = (date: Date, timeZone: string): number => {
  const parts = getDatePartsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return (asUtc - date.getTime()) / 60000;
};

export const makeZonedDate = (
  {
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0
  }: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
  },
  timeZone: string
): Date => {
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimeZoneOffsetMinutes(utcDate, timeZone);
  return new Date(utcDate.getTime() - offset * 60000);
};
