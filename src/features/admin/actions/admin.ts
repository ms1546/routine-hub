'use server';

import { addHumanEvaluation } from '@/features/ai/execution-log';
import { assertAdminUser, getCurrentUser } from '@/infrastructure/auth/session';
import { getMaintenanceState, setMaintenanceState } from '@/infrastructure/system/maintenance';

export async function addHumanEvaluationAction(input: {
  executionId: string;
  score: number;
  comment: string;
}) {
  const user = getCurrentUser();
  assertAdminUser(user);
  if (!Number.isFinite(input.score) || input.score < 1 || input.score > 5) {
    throw new Error('Score must be between 1 and 5.');
  }
  return addHumanEvaluation({
    executionId: input.executionId,
    reviewer: user,
    score: Math.round(input.score * 10) / 10,
    comment: input.comment.slice(0, 500)
  });
}

export async function setMaintenanceModeAction(input: { enabled: boolean; message?: string }) {
  const user = getCurrentUser();
  assertAdminUser(user);
  setMaintenanceState(input.enabled, input.message);
  return getMaintenanceState();
}
