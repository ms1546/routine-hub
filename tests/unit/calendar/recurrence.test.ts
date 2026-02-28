import { describe, it, expect } from 'vitest';
import { recurrencePatternSchema } from '@/features/calendar/domain/mock';
import { buildProposedEvents } from '@/features/calendar/domain/proposals';
import type { Routine } from '@/features/routines';
import { randomUUID } from 'node:crypto';

const createMockRoutine = (): Routine => ({
  id: randomUUID(),
  name: 'Test Routine',
  description: 'Test description',
  purpose: 'Test purpose',
  durationType: 'weekly',
  visibility: 'public',
  tags: ['test'],
  owner: 'test@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  timeBlocks: [
    {
      id: randomUUID(),
      day: 'monday',
      startHour: 9,
      endHour: 12,
      label: 'Morning Block',
      objective: 'Morning work',
      energyLevel: 'high'
    }
  ],
  stats: { clones: 0, applications: 0, likes: 0 }
});

describe('recurrencePatternSchema', () => {
  it('accepts "none" pattern', () => {
    const result = recurrencePatternSchema.parse({ type: 'none' });
    expect(result).toEqual({ type: 'none' });
  });

  it('accepts "weekly" pattern with default interval', () => {
    const result = recurrencePatternSchema.parse({ type: 'weekly' });
    expect(result).toEqual({ type: 'weekly', interval: 1 });
  });

  it('accepts "weekly" pattern with custom interval', () => {
    const result = recurrencePatternSchema.parse({ type: 'weekly', interval: 2 });
    expect(result).toEqual({ type: 'weekly', interval: 2 });
  });

  it('accepts "monthly" pattern with default interval', () => {
    const result = recurrencePatternSchema.parse({ type: 'monthly' });
    expect(result).toEqual({ type: 'monthly', interval: 1 });
  });

  it('accepts "monthly" pattern with custom interval', () => {
    const result = recurrencePatternSchema.parse({ type: 'monthly', interval: 3 });
    expect(result).toEqual({ type: 'monthly', interval: 3 });
  });

  it('rejects invalid interval for weekly', () => {
    expect(() => recurrencePatternSchema.parse({ type: 'weekly', interval: 0 })).toThrow();
    expect(() => recurrencePatternSchema.parse({ type: 'weekly', interval: 53 })).toThrow();
  });

  it('rejects invalid interval for monthly', () => {
    expect(() => recurrencePatternSchema.parse({ type: 'monthly', interval: 0 })).toThrow();
    expect(() => recurrencePatternSchema.parse({ type: 'monthly', interval: 13 })).toThrow();
  });

  it('rejects invalid type', () => {
    expect(() => recurrencePatternSchema.parse({ type: 'daily' })).toThrow();
  });
});

describe('buildProposedEvents with recurrence', () => {
  it('includes recurrence in proposed events when provided', () => {
    const routine = createMockRoutine();
    const window = {
      start: '2025-02-03T00:00:00.000Z',
      end: '2025-02-10T00:00:00.000Z',
      timezone: 'UTC'
    };
    const recurrence = { type: 'weekly' as const, interval: 1 };

    const events = buildProposedEvents(routine, window, recurrence);

    // weekly: 期間内の毎週月曜に1件ずつ（2/3 と 2/10）
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.recurrence).toEqual({ type: 'weekly', interval: 1 });
  });

  it('includes "none" recurrence when explicitly provided', () => {
    const routine = createMockRoutine();
    const window = {
      start: '2025-02-03T00:00:00.000Z',
      end: '2025-02-10T00:00:00.000Z',
      timezone: 'UTC'
    };
    const recurrence = { type: 'none' as const };

    const events = buildProposedEvents(routine, window, recurrence);

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.recurrence).toEqual({ type: 'none' });
  });

  it('does not include recurrence when not provided', () => {
    const routine = createMockRoutine();
    const window = {
      start: '2025-02-03T00:00:00.000Z',
      end: '2025-02-10T00:00:00.000Z',
      timezone: 'UTC'
    };

    const events = buildProposedEvents(routine, window);

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.recurrence).toBeUndefined();
  });

  it('includes monthly recurrence with interval', () => {
    const routine = createMockRoutine();
    const window = {
      start: '2025-02-03T00:00:00.000Z',
      end: '2025-02-10T00:00:00.000Z',
      timezone: 'UTC'
    };
    const recurrence = { type: 'monthly' as const, interval: 2 };

    const events = buildProposedEvents(routine, window, recurrence);

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.recurrence).toEqual({ type: 'monthly', interval: 2 });
  });
});

describe('buildProposedEvents durationType', () => {
  it('weekly: generates one event per matching weekday in range', () => {
    const routine = createMockRoutine(); // 1 block on Monday
    const window = {
      start: '2025-02-03T00:00:00.000Z',
      end: '2025-02-09T23:59:59.999Z',
      timezone: 'UTC'
    };
    const events = buildProposedEvents(routine, window);
    expect(events).toHaveLength(1);
    expect(events[0]?.start).toContain('2025-02-03');
  });

  it('normal: generates events for every day in range', () => {
    const routine: Routine = {
      ...createMockRoutine(),
      durationType: 'normal',
      normalStartHour: 8,
      normalEndHour: 12,
      timeBlocks: [
        {
          id: randomUUID(),
          day: 'monday',
          startHour: 9,
          endHour: 11,
          label: 'Block',
          objective: 'Obj',
          energyLevel: 'medium'
        }
      ]
    };
    const window = {
      start: '2025-02-03T00:00:00.000Z',
      end: '2025-02-05T00:00:00.000Z',
      timezone: 'UTC'
    };
    const events = buildProposedEvents(routine, window);
    expect(events).toHaveLength(3);
    const dates = events.map((e) => e.start.slice(0, 10));
    expect(dates).toContain('2025-02-03');
    expect(dates).toContain('2025-02-04');
    expect(dates).toContain('2025-02-05');
  });
});
