'use server';

import { runRoutineAiWorkflow } from '@/features/ai';
import { routinesRepository } from '@/features/routines';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { userSettingsRepository } from '@/features/users';
import {
  canExecuteWorkflow,
  recordWorkflowFailure,
  recordWorkflowSuccess,
  registerExecutionUsage
} from '@/features/ai/execution-log';

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

  // ユーザー設定を取得（なければデフォルト値で作成）
  const settings = await userSettingsRepository.getOrCreate(user.id, {
    displayName: user.displayName,
    timezone: 'Asia/Tokyo',
    requiredSleepHours: 7,
    priorities: ['集中時間を守る', 'カレンダーの権威を尊重'],
    constraints: ['手動確認を好む'],
    energyLevel: 'medium'
  });

  const userContext = {
    timezone: settings.timezone,
    requiredSleepHours: settings.requiredSleepHours,
    preferredWorkStartTime: settings.preferredWorkStartTime,
    preferredWorkEndTime: settings.preferredWorkEndTime,
    minBreakBetweenMinutes: settings.minBreakBetweenMinutes,
    priorities: settings.priorities,
    constraints: settings.constraints,
    energyLevel: settings.energyLevel
  };

  try {
    const result = await runRoutineAiWorkflow({
      routine,
      user: userContext,
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
