import { describe, expect, it, vi } from 'vitest';
import type { Routine } from '@/features/routines';
import type { RoutineAiWorkflowInput } from '@/features/ai/types';
import { runProfileAgent } from '@/features/ai/agents/profile-agent';
import { runRoutineInterpreterAgent } from '@/features/ai/agents/routine-interpreter-agent';
import { runCalendarConflictAgent } from '@/features/ai/agents/calendar-conflict-agent';

vi.mock('@/features/ai/llm/client', () => ({
  callLlm: vi.fn(async () => ({
    text: 'mocked response'
  }))
}));

const routine: Routine = {
  id: 'test-routine',
  name: 'Deep Focus Reset',
  description: '',
  purpose: '',
  durationType: 'weekly',
  visibility: 'public',
  tags: [],
  owner: 'owner@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  timeBlocks: [],
  stats: { clones: 0, applications: 0, likes: 0 }
};

const baseInput: RoutineAiWorkflowInput['user'] = {
  timezone: 'UTC',
  priorities: ['丁寧な意思疎通'],
  constraints: ['travel buffer'],
  energyLevel: 'medium'
};

describe('AI agents (unit)', () => {
  it('builds profile summary structure', async () => {
    const profile = await runProfileAgent({ userProfile: baseInput });

    expect(profile.agent).toMatch(/profile-agent$/);
    expect(profile.data).toHaveProperty('persona');
    expect(profile.data).toHaveProperty('highlightedConstraints');
    expect(Array.isArray(profile.data.highlightedConstraints)).toBe(true);
  });

  it('interprets routine intent structurally', async () => {
    const profile = await runProfileAgent({ userProfile: baseInput });

    const interpretation = await runRoutineInterpreterAgent({
      routine,
      profileSummary: profile.data
    });

    expect(interpretation.agent).toMatch(/routine-interpreter-agent$/);
    expect(interpretation.data).toHaveProperty('intent');
    expect(interpretation.data).toHaveProperty('successSignals');
  });

  it('detects calendar conflicts heuristically', async () => {
    const conflicts = await runCalendarConflictAgent({
      routine,
      interpretedRoutineIntent: {
        intent: ['deep focus'],
        successSignals: ['no interruption'],
        riskSignals: []
      },
      userProfile: baseInput,
      calendarWindow: {
        startDate: '2025-01-01',
        endDate: '2025-01-05'
      }
    });

    expect(conflicts.agent).toMatch(/calendar-conflict-agent$/);
    expect(Array.isArray(conflicts.data.conflicts)).toBe(true);
  });
});
