import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { addHumanEvaluationAction } from '@/app/actions/admin';
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
        intent: 'Stay aligned',
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

  it('allows admins to store human evaluations', async () => {
    process.env.MOCK_USER_EMAIL = 'routinehub.dev@gmail.com';
    const routine = (await routinesRepository.list())[0];
    const workflow = buildWorkflowResult();
    const user = getCurrentUser();
    recordWorkflowSuccess({ result: workflow, workflowName: 'routine-ai-workflow', routine, user });

    const updated = await addHumanEvaluationAction({
      executionId: workflow.meta.executionId,
      score: 4,
      comment: 'Looks aligned with guardrails.'
    });

    expect(updated.hasHumanEvaluation).toBe(true);
    expect(updated.humanEvaluations[0]?.comment).toContain('guardrails');
  });

  it('rejects members when writing human evaluations', async () => {
    process.env.MOCK_USER_EMAIL = 'owner@example.com';
    await expect(
      addHumanEvaluationAction({ executionId: 'missing', score: 3, comment: 'n/a' })
    ).rejects.toThrowError('Admin access required');
  });

  it('surfaces evaluation metadata without exposing prompts', async () => {
    process.env.MOCK_USER_EMAIL = 'routinehub.dev@gmail.com';
    const routine = (await routinesRepository.list())[0];
    const workflow = buildWorkflowResult();
    const user = getCurrentUser();
    const record = recordWorkflowSuccess({
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
