import { describe, it, expect } from 'vitest';
import { routineApplicationSchema, recurrencePatternSchema } from '@/features/calendar/domain/mock';

describe('routineApplicationSchema', () => {
  const validInput = {
    routineId: '11111111-1111-4111-8111-111111111111',
    startDate: '2025-02-01',
    endDate: '2025-02-07'
  };

  it('accepts valid input without recurrence', () => {
    const result = routineApplicationSchema.parse(validInput);
    expect(result.recurrence).toEqual({ type: 'none' });
  });

  it('accepts valid input with weekly recurrence', () => {
    const result = routineApplicationSchema.parse({
      ...validInput,
      recurrence: { type: 'weekly', interval: 1 }
    });
    expect(result.recurrence).toEqual({ type: 'weekly', interval: 1 });
  });

  it('accepts valid input with monthly recurrence', () => {
    const result = routineApplicationSchema.parse({
      ...validInput,
      recurrence: { type: 'monthly', interval: 2 }
    });
    expect(result.recurrence).toEqual({ type: 'monthly', interval: 2 });
  });

  it('defaults to "none" recurrence when not provided', () => {
    const result = routineApplicationSchema.parse(validInput);
    expect(result.recurrence).toEqual({ type: 'none' });
  });

  it('rejects when startDate is after endDate', () => {
    expect(() =>
      routineApplicationSchema.parse({
        ...validInput,
        startDate: '2025-02-07',
        endDate: '2025-02-01'
      })
    ).toThrow();
  });

  it('rejects invalid date format', () => {
    expect(() =>
      routineApplicationSchema.parse({
        ...validInput,
        startDate: '2025/02/01'
      })
    ).toThrow();
  });
});

describe('recurrencePatternSchema', () => {
  it('validates "none" type', () => {
    const result = recurrencePatternSchema.parse({ type: 'none' });
    expect(result).toEqual({ type: 'none' });
  });

  it('validates "weekly" type with interval', () => {
    const result = recurrencePatternSchema.parse({ type: 'weekly', interval: 2 });
    expect(result).toEqual({ type: 'weekly', interval: 2 });
  });

  it('validates "monthly" type with interval', () => {
    const result = recurrencePatternSchema.parse({ type: 'monthly', interval: 3 });
    expect(result).toEqual({ type: 'monthly', interval: 3 });
  });

  it('rejects invalid interval ranges', () => {
    expect(() => recurrencePatternSchema.parse({ type: 'weekly', interval: 0 })).toThrow();
    expect(() => recurrencePatternSchema.parse({ type: 'weekly', interval: 53 })).toThrow();
    expect(() => recurrencePatternSchema.parse({ type: 'monthly', interval: 0 })).toThrow();
    expect(() => recurrencePatternSchema.parse({ type: 'monthly', interval: 13 })).toThrow();
  });
});
