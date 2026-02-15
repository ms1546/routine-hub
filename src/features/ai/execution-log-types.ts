/**
 * Execution Log Types
 *
 * Type definitions for AI execution logging.
 * These types are separated from execution-log.ts to allow Storybook
 * to import them without importing AWS SDK dependencies.
 */

import type { RoutineAiWorkflowResult } from './types';

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
  userId: string; // DynamoDB用に追加
  status: ExecutionStatus;
  executedAt: string;
  judgeScore?: number;
  judgeVerdict?: RoutineAiWorkflowResult['evaluation']['data']['verdict'];
  hasHumanEvaluation: boolean;
  failureReason?: string;
  humanEvaluations: HumanEvaluation[];
  langfuseTraceId?: string; // LangfuseのtraceId（評価記録用）
};
