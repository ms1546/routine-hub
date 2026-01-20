import { describe, expect, it } from 'vitest';
import {
  applyRoutineAction,
  createRoutineAction
} from '@/app/actions/routines';
import { routinesRepository } from '@/features/routines';

const buildFormData = () => {
  const formData = new FormData();
  formData.set('name', 'Story Routine');
  formData.set('description', 'A long enough description to satisfy schema.');
  formData.set('purpose', 'Illustrate server actions.');
  formData.set('durationType', 'weekly');
  formData.set('visibility', 'private');
  formData.set('tags', 'demo, focus');
  formData.set('owner', 'storybook@example.com');
  formData.set('blockDay', 'wednesday');
  formData.set('blockStartHour', '9');
  formData.set('blockEndHour', '12'); // 3 hours - meets minimum total requirement
  formData.set('blockLabel', 'Demo Label');
  formData.set('blockObjective', 'Explain workflows');
  formData.set('blockEnergy', 'medium');
  return formData;
};

describe('Routine server actions', () => {
  const originalEnv = process.env.MOCK_USER_EMAIL;

  beforeEach(() => {
    process.env.MOCK_USER_EMAIL = 'storybook@example.com';
  });

  afterEach(() => {
    process.env.MOCK_USER_EMAIL = originalEnv;
  });

  it('creates a routine via server action', async () => {
    const response = await createRoutineAction(buildFormData());
    expect(response.ok).toBe(true);
    expect(response.data).toBeDefined();
    const { getCurrentUser } = await import('@/infrastructure/auth/session');
    const currentUser = await getCurrentUser();
    const created = await routinesRepository.get(response.data!.id, currentUser.id);
    expect(created?.name).toBe('Story Routine');
  });

  it('builds a preview when applying a routine', async () => {
    const { getCurrentUser } = await import('@/infrastructure/auth/session');
    const currentUser = await getCurrentUser();
    const targetId = '11111111-1111-4111-8111-111111111111';
    const before = await routinesRepository.get(targetId, currentUser.id);
    const preview = await applyRoutineAction({
      routineId: targetId,
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      recurrence: { type: 'none' }
    });

    expect(preview.ok).toBe(true);
    expect(preview.data?.totalBlocks).toBeGreaterThan(0);

    const after = await routinesRepository.get(targetId, currentUser.id);
    expect(after?.stats.applications).toBe((before?.stats.applications ?? 0) + 1);
  });

  it('applies a routine with recurrence pattern', async () => {
    const targetId = '11111111-1111-4111-8111-111111111111';
    const preview = await applyRoutineAction({
      routineId: targetId,
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      recurrence: { type: 'weekly', interval: 1 }
    });

    expect(preview.ok).toBe(true);
    expect(preview.data?.totalBlocks).toBeGreaterThan(0);
  });
});
