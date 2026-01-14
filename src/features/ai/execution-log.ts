import { randomUUID } from 'node:crypto';
import type { Routine } from '@/features/routines';
import type { RoutineAiWorkflowResult } from './types';
import type { AuthenticatedUser } from '@/infrastructure/auth/session';

export type ExecutionStatus = 'success' | 'failure';

export type HumanEvaluation = {
  id: string;
  executionId: string;
  reviewerId: string;
  reviewerName: string;
  score: number;
  comment: string;
  createdAt: string;
};

export type ExecutionRecord = {
  id: string;
  workflowName: string;
  routineId: string;
  routineName: string;
  triggeredBy: string;
  triggeredByEmail: string;
  status: ExecutionStatus;
  executedAt: string;
  judgeScore?: number;
  judgeVerdict?: RoutineAiWorkflowResult['evaluation']['data']['verdict'];
  hasHumanEvaluation: boolean;
  failureReason?: string;
  humanEvaluations: HumanEvaluation[];
};

const executionRecords: ExecutionRecord[] = [];
const userExecutionCounts = new Map<string, number>();
const MAX_NON_ADMIN_EXECUTIONS = 1;

export function getExecutionRecords(limit = 50): ExecutionRecord[] {
  return executionRecords.slice(0, limit);
}

export function getExecutionRecord(executionId: string): ExecutionRecord | undefined {
  return executionRecords.find((record) => record.id === executionId);
}

export function addHumanEvaluation(input: {
  executionId: string;
  reviewer: AuthenticatedUser;
  score: number;
  comment: string;
}): ExecutionRecord {
  const record = executionRecords.find((item) => item.id === input.executionId);
  if (!record) {
    throw new Error('Execution record not found');
  }
  const entry: HumanEvaluation = {
    id: randomUUID(),
    executionId: record.id,
    reviewerId: input.reviewer.id,
    reviewerName: input.reviewer.displayName,
    score: input.score,
    comment: input.comment,
    createdAt: new Date().toISOString()
  };
  record.humanEvaluations.unshift(entry);
  record.hasHumanEvaluation = true;
  return record;
}

const getAverageJudgeScore = (result: RoutineAiWorkflowResult): number => {
  const { clarity, consistency, explanationQuality } = result.evaluation.data;
  const total = clarity.score + consistency.score + explanationQuality.score;
  return Math.round((total / 3) * 10) / 10;
};

const pushRecord = (record: ExecutionRecord) => {
  executionRecords.unshift(record);
  if (executionRecords.length > 200) {
    executionRecords.length = 200;
  }
  return record;
};

export function recordWorkflowSuccess(input: {
  result: RoutineAiWorkflowResult;
  workflowName: string;
  routine: Routine;
  user: AuthenticatedUser;
}): ExecutionRecord {
  const record: ExecutionRecord = {
    id: input.result.meta.executionId,
    workflowName: input.workflowName,
    routineId: input.routine.id,
    routineName: input.routine.name,
    triggeredBy: input.user.displayName,
    triggeredByEmail: input.user.email,
    status: 'success',
    executedAt: new Date().toISOString(),
    judgeScore: getAverageJudgeScore(input.result),
    judgeVerdict: input.result.evaluation.data.verdict,
    hasHumanEvaluation: false,
    humanEvaluations: []
  };
  return pushRecord(record);
}

export function recordWorkflowFailure(input: {
  workflowName: string;
  routine: Routine;
  user: AuthenticatedUser;
  error: Error;
}): ExecutionRecord {
  const record: ExecutionRecord = {
    id: randomUUID(),
    workflowName: input.workflowName,
    routineId: input.routine.id,
    routineName: input.routine.name,
    triggeredBy: input.user.displayName,
    triggeredByEmail: input.user.email,
    status: 'failure',
    executedAt: new Date().toISOString(),
    failureReason: input.error.message,
    hasHumanEvaluation: false,
    humanEvaluations: []
  };
  return pushRecord(record);
}

export function getExecutionLimit(user: AuthenticatedUser): { limit: number | null; used: number; remaining: number | null } {
  if (user.role === 'admin') {
    return { limit: null, used: 0, remaining: null };
  }
  const used = userExecutionCounts.get(user.id) ?? 0;
  const remaining = Math.max(0, MAX_NON_ADMIN_EXECUTIONS - used);
  return { limit: MAX_NON_ADMIN_EXECUTIONS, used, remaining };
}

export function canExecuteWorkflow(user: AuthenticatedUser): boolean {
  if (user.role === 'admin') {
    return true;
  }
  const usage = userExecutionCounts.get(user.id) ?? 0;
  return usage < MAX_NON_ADMIN_EXECUTIONS;
}

export function registerExecutionUsage(user: AuthenticatedUser): void {
  if (user.role === 'admin') {
    return;
  }
  const usage = userExecutionCounts.get(user.id) ?? 0;
  userExecutionCounts.set(user.id, usage + 1);
}

export function resetExecutionLogForTests(): void {
  executionRecords.length = 0;
  userExecutionCounts.clear();
}
