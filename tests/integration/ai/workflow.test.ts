import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Routine } from '@/features/routines';
import {
  runRoutineAiWorkflow,
  setRoutineAiWorkflowRunner,
  getRoutineAiWorkflowRunner,
} from '@/features/ai';
import { MockRoutineAiWorkflowRunner } from '@/features/ai/workflows/routine-mock-runner';

describe('Routine AI workflow (integration)', () => {
  let originalRunner: ReturnType<typeof getRoutineAiWorkflowRunner>;

  beforeEach(() => {
    originalRunner = getRoutineAiWorkflowRunner();
    setRoutineAiWorkflowRunner(new MockRoutineAiWorkflowRunner());
  });

  afterEach(() => {
    setRoutineAiWorkflowRunner(originalRunner);
  });

  it('chains agents, evaluation, and Langfuse boundary', async () => {
    const result = await runRoutineAiWorkflow({
      routine: {
        id: randomUUID(),
        name: 'Lead Flow Rhythm',
        description: '',
        purpose: '',
        durationType: 'weekly',
        visibility: 'private',
        tags: [],
        owner: 'ops@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        timeBlocks: [],
        stats: { clones: 0, applications: 0, likes: 0 },
      },
      user: {
        timezone: 'Asia/Tokyo',
        priorities: ['集中を守る'],
        constraints: ['非同期サマリ必須'],
        energyLevel: 'high',
      },
      calendarWindow: {
        startDate: '2025-02-01',
        endDate: '2025-02-04',
      },
    });

    expect(result.profile.agent).toContain('profile-agent');
    expect(result.meta.proposalsOnly).toBe(true);
    expect(result.meta.langfuseTraceId).toBeTruthy();
  }, 30000);
});
