'use server';

import { runRoutineAiWorkflow } from '@/lib/ai';
import { routinesRepository } from '@/lib/routines';

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
  const routine = await routinesRepository.get(routineId);
  if (!routine) {
    throw new Error('Routine not found');
  }

  return runRoutineAiWorkflow({
    routine,
    user: defaultUserContext,
    calendarWindow: defaultWindow
  });
}
