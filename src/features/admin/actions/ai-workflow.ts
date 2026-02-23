'use server';

import { runRoutineAiWorkflow } from '@/features/ai';
import { routinesRepository } from '@/features/routines';
import { getCurrentUser } from '@/infrastructure/auth/session';
import {
  canExecuteWorkflow,
  recordWorkflowFailure,
  recordWorkflowSuccess,
  registerExecutionUsage
} from '@/features/ai/execution-log';

const defaultUserContext = {
  timezone: 'UTC',
  priorities: ['protect focus blocks', 'respect calendar authority'],
  constraints: ['prefers manual confirmation'],
  energyLevel: 'medium' as const
};

const defaultWindow = {
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
};

export async function previewRoutineAiAction(routineId: string) {
  const user = await getCurrentUser();
  const routine = await routinesRepository.get(routineId, user.id, user.email, user.role === 'admin');
  if (!routine) {
    throw new Error('Routine not found');
  }
  if (!(await canExecuteWorkflow(user))) {
    throw new Error('AI preview limit reached for this account.');
  }

  try {
    const result = await runRoutineAiWorkflow({
      routine,
      user: defaultUserContext,
      calendarWindow: defaultWindow
    });
    await registerExecutionUsage(user);
    await recordWorkflowSuccess({
      result,
      workflowName: 'routine-ai-workflow',
      routine,
      user
    });
    return result;
  } catch (error) {
    await registerExecutionUsage(user);
    await recordWorkflowFailure({
      workflowName: 'routine-ai-workflow',
      routine,
      user,
      error: error instanceof Error ? error : new Error('AI preview failed')
    });
    throw error;
  }
}
