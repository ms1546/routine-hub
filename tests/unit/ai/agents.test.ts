import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Routine } from '@/lib/routines';
import type { RoutineAiWorkflowInput } from '@/lib/ai/types';
import { runProfileAgent } from '@/lib/ai/agents/profile-agent';
import { runRoutineInterpreterAgent } from '@/lib/ai/agents/routine-interpreter-agent';
import { runCalendarConflictAgent } from '@/lib/ai/agents/calendar-conflict-agent';

const routine: Routine = {
  id: randomUUID(),
  name: 'Deep Focus Reset',
  description: '個人開発者が集中時間を守るためのリズム。',
  purpose: '燃え尽きを避けつつ成果物を届ける',
  durationType: 'weekly',
  visibility: 'public',
  tags: ['focus', 'reset'],
  owner: 'owner@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  timeBlocks: [
    {
      id: randomUUID(),
      day: 'monday',
      startHour: 7,
      endHour: 11,
      label: 'Deep work',
      objective: 'Ship critical artifact',
      energyLevel: 'high'
    }
  ],
  stats: { forks: 1, applications: 10 }
};

const baseInput: RoutineAiWorkflowInput = {
  routine,
  user: {
    timezone: 'UTC',
    priorities: ['丁寧な意思疎通'],
    constraints: ['travel buffer'],
    energyLevel: 'medium'
  },
  calendarWindow: {
    startDate: '2025-01-01',
    endDate: '2025-01-05'
  }
};

describe('AI agents', () => {
  it('summarizes user profile', async () => {
    const profile = await runProfileAgent(baseInput);
    expect(profile.agent).toBe('profile-agent');
    expect(profile.data.persona).toContain('PROFILE');
    expect(profile.data.highlightedConstraints).toContain('travel buffer');
  });

  it('interprets routine intent', async () => {
    const interpretation = await runRoutineInterpreterAgent(baseInput);
    expect(interpretation.data.successSignals.length).toBeGreaterThan(0);
    expect(interpretation.data.intent).toContain('INTERPRETATION');
  });

  it('detects conflicts based on heuristics', async () => {
    const conflicts = await runCalendarConflictAgent(baseInput);
    expect(conflicts.data.conflicts.some((c) => c.id === 'early-start')).toBe(true);
  });
});
