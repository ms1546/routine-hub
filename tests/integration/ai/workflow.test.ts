import { describe, expect, it, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Routine } from '@/features/routines';
import { runRoutineAiWorkflow, setRoutineAiWorkflowRunner } from '@/features/ai';
import { MockRoutineAiWorkflowRunner } from '@/features/ai/workflows/routine-mock-runner';

const routine: Routine = {
  id: randomUUID(),
  name: 'Lead Flow Rhythm',
  description: '意思決定とコーチングを週内で安定させる。',
  purpose: 'プロダクト責任者の認知負荷を下げる',
  durationType: 'weekly',
  visibility: 'private',
  tags: ['leadership'],
  owner: 'ops@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  timeBlocks: [
    {
      id: randomUUID(),
      day: 'wednesday',
      startHour: 10,
      endHour: 14,
      label: '整合ミーティング',
      objective: 'ロードマップの優先順位を決める',
      energyLevel: 'medium'
    },
    {
      id: randomUUID(),
      day: 'thursday',
      startHour: 15,
      endHour: 18,
      label: 'コーチング',
      objective: '1on1をまとめて実施',
      energyLevel: 'low'
    }
  ],
  stats: { clones: 0, applications: 0, likes: 0 }
};

describe('Routine AI workflow', () => {
  beforeEach(() => {
    setRoutineAiWorkflowRunner(new MockRoutineAiWorkflowRunner());
  });

  it('chains agents, evaluation, and Langfuse boundary', async () => {
    const result = await runRoutineAiWorkflow({
      routine,
      user: {
        timezone: 'Asia/Tokyo',
        priorities: ['集中を守る'],
        constraints: ['非同期サマリ必須'],
        energyLevel: 'high'
      },
      calendarWindow: {
        startDate: '2025-02-01',
        endDate: '2025-02-04'
      }
    });

    expect(result.profile.agent).toContain('profile-agent');
    expect(result.optimizations.data.proposals.length).toBeGreaterThan(0);
    expect(result.evaluation.data.verdict).toMatch(/approve|revise/);
    expect(result.meta.proposalsOnly).toBe(true);
    expect(result.meta.langfuseTraceId).toBeTruthy();
  });
});
