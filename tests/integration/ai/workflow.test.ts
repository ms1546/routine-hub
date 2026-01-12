import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Routine } from '@/lib/routines';
import { runRoutineAiWorkflow } from '@/lib/ai';

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
  stats: { forks: 0, applications: 0 }
};

describe('Routine AI workflow', () => {
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

    expect(result.profile.agent).toBe('profile-agent');
    expect(result.optimizations.data.proposals.length).toBeGreaterThan(0);
    expect(result.evaluation.data.verdict).toMatch(/approve|revise/);
    expect(result.meta.proposalsOnly).toBe(true);
    expect(result.meta.langfuseTraceId).toContain('mock-trace');
  });
});
