import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Routine } from '@/features/routines';
import type { RoutineAiWorkflowInput } from '@/features/ai/types';
import { runProfileAgent } from '@/features/ai/agents/profile-agent';
import { runRoutineInterpreterAgent } from '@/features/ai/agents/routine-interpreter-agent';
import { runCalendarConflictAgent } from '@/features/ai/agents/calendar-conflict-agent';

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
  stats: { forks: 1, applications: 10, likes: 5 }
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
    const profile = await runProfileAgent({ userProfile: baseInput.user });
    expect(profile.agent).toContain('profile-agent');
    expect(profile.data.persona.length).toBeGreaterThan(0);
    expect(profile.data.highlightedConstraints).toContain('travel buffer');
  });

  it('interprets routine intent', async () => {
    const profile = await runProfileAgent({ userProfile: baseInput.user });
    const interpretation = await runRoutineInterpreterAgent({
      routine,
      profileSummary: profile.data
    });
    expect(interpretation.data.successSignals.length).toBeGreaterThan(0);
    expect(interpretation.data.intent.length).toBeGreaterThan(0);
  });

  it('detects conflicts based on heuristics', async () => {
    const profile = await runProfileAgent({ userProfile: baseInput.user });
    const interpretation = await runRoutineInterpreterAgent({
      routine,
      profileSummary: profile.data
    });
    const conflicts = await runCalendarConflictAgent({
      routine,
      interpretedRoutineIntent: interpretation.data,
      userProfile: baseInput.user,
      calendarWindow: baseInput.calendarWindow
    });
    expect(conflicts.data.conflicts.some((c) => c.id === 'early-start')).toBe(true);
  });
});
