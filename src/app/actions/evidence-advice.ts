'use server';

import type { EvidenceAdviceResult } from '@/features/ai/evidence/types';
import { evidenceDisclaimer } from '@/features/ai/tools/evidence-policy-tool';
import { mastraRepository } from '@/features/ai/mastra/repository';
import { routinesRepository } from '@/features/routines';
import { userSettingsRepository } from '@/features/users';
import { getCurrentUser } from '@/infrastructure/auth/session';

export async function getEvidenceAdviceAction({
  routineId
}: {
  routineId: string;
}): Promise<EvidenceAdviceResult> {
  const currentUser = await getCurrentUser();
  const routine = await routinesRepository.get(
    routineId,
    currentUser.id,
    currentUser.email,
    currentUser.role === 'admin'
  );
  if (!routine) {
    throw new Error('Routine not found');
  }

  const settings = await userSettingsRepository.getOrCreate(currentUser.id, {
    displayName: currentUser.displayName,
    timezone: 'Asia/Tokyo',
    requiredSleepHours: 7,
    priorities: ['集中時間を守る', 'カレンダーの権威を尊重'],
    constraints: ['手動確認を好む'],
    energyLevel: 'medium'
  });

  const workflow = mastraRepository.getWorkflows().evidenceAdviceWorkflow;
  if (!workflow) {
    return {
      query: '',
      suggestions: [],
      warnings: ['Evidence workflow is not available.'],
      disclaimer: evidenceDisclaimer
    };
  }

  try {
    const run = await workflow.createRunAsync();
    const runResult = await run.start({
      inputData: {
        routine,
        userProfile: {
          timezone: settings.timezone,
          priorities: settings.priorities,
          constraints: settings.constraints,
          energyLevel: settings.energyLevel
        },
        minEvidenceCount: 1
      }
    });

    if (runResult.status !== 'success' || !runResult.result) {
      throw new Error('Evidence advice workflow execution failed');
    }

    return runResult.result;
  } catch (error) {
    console.error('[EvidenceAdvice] Workflow execution failed:', error);
    return {
      query: '',
      suggestions: [],
      warnings: ['根拠取得に失敗しました。時間を置いて再試行してください。'],
      disclaimer: evidenceDisclaimer
    };
  }
}
