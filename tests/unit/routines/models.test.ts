import { describe, expect, it } from 'vitest';
import { createRoutineSchema, normalizeTags } from '@/lib/routines';

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

    expect(() => createRoutineSchema.parse(invalid)).toThrow(/3 hours/);
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
