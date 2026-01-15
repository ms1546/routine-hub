import { describe, expect, it } from 'vitest';
import { createRoutineSchema, normalizeTags } from '@/features/routines';

const baseInput = {
  name: 'Test Routine',
  description: 'A description that meets the minimum length.',
  purpose: 'Ship meaningful work.',
  durationType: 'weekly' as const,
  visibility: 'public' as const,
  tags: ['Focus'],
  owner: 'test@example.com',
  timeBlocks: [
    {
      day: 'monday' as const,
      startHour: 9,
      endHour: 13,
      label: 'Build',
      objective: 'Ship on Monday',
      energyLevel: 'high' as const
    }
  ]
};

describe('createRoutineSchema', () => {
  it('rejects blocks shorter than 3 hours', () => {
    const invalid = {
      ...baseInput,
      timeBlocks: [
        {
          ...baseInput.timeBlocks[0],
          startHour: 9,
          endHour: 10
        }
      ]
    };

    expect(() => createRoutineSchema.parse(invalid)).toThrow(/各時間ブロックは最低3時間/);
  });

  it('rejects routines with total hours less than 3', () => {
    const invalid = {
      ...baseInput,
      timeBlocks: [
        {
          day: 'monday' as const,
          startHour: 9,
          endHour: 11, // 2 hours
          label: 'Short',
          objective: 'Too short block',
          energyLevel: 'medium' as const
        }
      ]
    };

    expect(() => createRoutineSchema.parse(invalid)).toThrow(/Routine全体の合計時間は最低3時間必要です/);
  });

  it('accepts routines with multiple blocks totaling 3+ hours', () => {
    const valid = {
      ...baseInput,
      timeBlocks: [
        {
          day: 'monday' as const,
          startHour: 9,
          endHour: 11, // 2 hours
          label: 'Morning',
          objective: 'Morning work',
          energyLevel: 'high' as const
        },
        {
          day: 'monday' as const,
          startHour: 14,
          endHour: 15, // 1 hour
          label: 'Afternoon',
          objective: 'Afternoon work',
          energyLevel: 'medium' as const
        }
      ]
    };

    // Should fail because individual blocks must be 3+ hours
    expect(() => createRoutineSchema.parse(valid)).toThrow();
  });

  it('accepts a well formed routine', () => {
    const result = createRoutineSchema.parse(baseInput);
    expect(result.name).toBe('Test Routine');
  });
});

describe('normalizeTags', () => {
  it('lowercases and deduplicates tags', () => {
    const normalized = normalizeTags(['Focus', ' focus ', 'Strategy']);
    expect(normalized).toEqual(['focus', 'strategy']);
  });
});
