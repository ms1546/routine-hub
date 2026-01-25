import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// import { addHumanEvaluationAction } from '@/app/actions/admin';
// 人間評価はLangfuse UIで行うため、アプリ側の評価機能は削除しました
import { routinesRepository } from '@/features/routines';
import {
  recordWorkflowSuccess,
  resetExecutionLogForTests
} from '@/features/ai/execution-log';
import type { RoutineAiWorkflowResult } from '@/features/ai/types';
import { randomUUID } from 'node:crypto';
import { getCurrentUser } from '@/infrastructure/auth/session';

const buildWorkflowResult = (): RoutineAiWorkflowResult => {
  const now = new Date().toISOString();
  return {
    profile: {
      agent: 'profile-agent',
      generatedAt: now,
      data: {
        persona: 'Builder',
        highlightedConstraints: ['Focus blocks'],
        toneGuidance: 'Calm'
      }
    },
    interpretation: {
      agent: 'interpreter',
      generatedAt: now,
      data: {
        intent: ['Stay aligned'],
        successSignals: ['Friction noted'],
        riskSignals: ['Fatigue']
      }
    },
    conflicts: {
      agent: 'conflict',
      generatedAt: now,
      data: {
        conflicts: [],
        assumptions: []
      }
    },
    optimizations: {
      agent: 'optimizer',
      generatedAt: now,
      data: {
        proposals: [
          { id: 'opt-1', title: 'Batch reviews', description: 'Group reviews', tradeOffs: [], aiOnly: false }
        ]
      }
    },
    futureSimulation: {
      agent: 'future',
      generatedAt: now,
      data: {
        outlook: 'Stable',
        guardrails: [],
        followUpQuestions: []
      }
    },
    evaluation: {
      agent: 'llm-judge',
      generatedAt: now,
      data: {
        clarity: { score: 4, rationale: 'ok' },
        consistency: { score: 3, rationale: 'ok' },
        explanationQuality: { score: 4, rationale: 'ok' },
        verdict: 'approve'
      }
    },
    meta: {
      executionId: randomUUID(),
      mastraTraceId: randomUUID(),
      proposalsOnly: true,
      langfuseTraceId: null
    }
  };
};

describe('admin actions', () => {
  const originalUser = process.env.MOCK_USER_EMAIL;

  beforeEach(() => {
    resetExecutionLogForTests();
  });

  afterEach(() => {
    process.env.MOCK_USER_EMAIL = originalUser;
  });

  // 人間評価はLangfuse UIで行うため、アプリ側の評価機能テストは削除しました
  // it('allows admins to store human evaluations', async () => { ... });
  // it('rejects members when writing human evaluations', async () => { ... });

  it('surfaces evaluation metadata without exposing prompts', async () => {
    process.env.MOCK_USER_EMAIL = 'routinehub.dev@gmail.com';
    const routine = await routinesRepository.create({
      name: 'Admin Seed Routine',
      description: 'Seed routine for admin action tests.',
      purpose: 'Ensure routine exists for execution log tests.',
      durationType: 'weekly',
      visibility: 'public',
      tags: ['seed'],
      owner: 'routinehub.dev@gmail.com',
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
    const workflow = buildWorkflowResult();
    const user = await getCurrentUser();
    const record = await recordWorkflowSuccess({
      result: workflow,
      workflowName: 'routine-ai-workflow',
      routine,
      user
    });

    expect(record.judgeScore).toBeGreaterThan(0);
    expect(record.status).toBe('success');
    expect(record.failureReason).toBeUndefined();
    expect(record.humanEvaluations).toHaveLength(0);
  });
});
