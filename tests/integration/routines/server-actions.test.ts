import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  applyRoutineAction,
  createRoutineAction
} from '@/app/actions/routines';
import { routinesRepository } from '@/features/routines';

let routineId: string;

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

  beforeEach(async () => {
    process.env.MOCK_USER_EMAIL = 'storybook@example.com';
    const routine = await routinesRepository.create({
      name: 'Seed Routine',
      description: 'Seed routine for server action tests.',
      purpose: 'Ensure routine exists for apply tests.',
      durationType: 'weekly',
      visibility: 'public',
      tags: ['seed'],
      owner: 'storybook@example.com',
      timeBlocks: [
        {
          day: 'monday',
          startHour: 9,
          endHour: 12,
          label: 'Seed Block',
          objective: 'Seed objective',
          energyLevel: 'medium'
        }
      ]
    });
    routineId = routine.id;
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
    const before = await routinesRepository.get(routineId, currentUser.id);
    const preview = await applyRoutineAction({
      routineId,
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      recurrence: { type: 'none' }
    });

    expect(preview.ok).toBe(true);
    expect(preview.data?.totalBlocks).toBeGreaterThan(0);

    const after = await routinesRepository.get(routineId, currentUser.id);
    expect(after?.stats.applications).toBe((before?.stats.applications ?? 0) + 1);
  });

  it('applies a routine with recurrence pattern', async () => {
    const preview = await applyRoutineAction({
      routineId,
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      recurrence: { type: 'weekly', interval: 1 }
    });

    expect(preview.ok).toBe(true);
    expect(preview.data?.totalBlocks).toBeGreaterThan(0);
  });

  it('allows admin to preview a private routine owned by another user', async () => {
    process.env.MOCK_USER_EMAIL = 'routunehub.dev@gmail.com';
    const privateRoutine = await routinesRepository.create({
      name: 'Admin Private Routine',
      description: 'Private routine for admin preview test.',
      purpose: 'Admin preview',
      durationType: 'weekly',
      visibility: 'private',
      tags: ['admin'],
      owner: 'owner@example.com',
      timeBlocks: [
        {
          day: 'friday',
          startHour: 9,
          endHour: 12,
          label: 'Admin Block',
          objective: 'Admin objective',
          energyLevel: 'medium'
        }
      ]
    });

    const preview = await applyRoutineAction({
      routineId: privateRoutine.id,
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      recurrence: { type: 'none' }
    });

    expect(preview.ok).toBe(true);
    expect(preview.data?.totalBlocks).toBeGreaterThan(0);
  });
});
