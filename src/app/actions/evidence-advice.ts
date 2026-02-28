'use server';

import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';
import type { EvidenceAdviceResult, EvidenceSuggestion } from '@/features/ai/evidence/types';
import { evidenceDisclaimer } from '@/features/ai/tools/evidence-policy-tool';
import { mastraRepository } from '@/features/ai/mastra/repository';
import { routinesRepository } from '@/features/routines';
import { userSettingsRepository } from '@/features/users';
import { getCurrentUser } from '@/infrastructure/auth/session';
import {
  recordLangfuseTrace,
  recordLangfuseScore,
  updateLangfuseTraceOutput
} from '@/features/ai/evaluation/langfuse-boundary';
import { getSystemPromptInfo } from '@/features/ai/evaluation/prompt-helper';

const generateUUID = createDefaultUUIDGenerator();

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

  const traceId = generateUUID();
  let promptVersions: Record<string, { version?: number; labels?: string[]; source: string }> = {};
  try {
    const promptInfo = await getSystemPromptInfo('evidence-advice-agent');
    promptVersions['evidence-advice-agent'] = {
      version: promptInfo.version,
      labels: promptInfo.labels,
      source: promptInfo.source
    };
  } catch {
    // プロンプト取得に失敗してもワークフロー実行は継続
  }

  await recordLangfuseTrace({
    workflow: 'evidence-advice-workflow',
    payload: {
      executionId: traceId,
      routineId,
      promptVersions
    },
    traceId
  });

  try {
    const run = await workflow.createRunAsync();
    const runResult = await run.start({
      inputData: {
        routine,
        userProfile: {
          timezone: settings.timezone,
          requiredSleepHours: settings.requiredSleepHours,
          preferredWorkStartTime: settings.preferredWorkStartTime,
          preferredWorkEndTime: settings.preferredWorkEndTime,
          minBreakBetweenMinutes: settings.minBreakBetweenMinutes,
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

    const result = runResult.result;
    const hasLiteratureEvidence = result.suggestions.some((s: EvidenceSuggestion) => s.evidence.length > 0);
    const isGenericFallback = result.suggestions.length > 0 && result.suggestions.every((s: EvidenceSuggestion) => s.evidence.length === 0);

    await updateLangfuseTraceOutput({
      traceId,
      output: {
        query: result.query,
        suggestions: result.suggestions,
        warnings: result.warnings
      }
    });

    await recordLangfuseScore({
      traceId,
      name: 'suggestions-count',
      value: result.suggestions.length,
      comment: `Evidence advice: ${result.suggestions.length} suggestion(s), ${result.warnings.length} warning(s)`,
      source: 'MODEL',
      metadata: {
        suggestionCount: result.suggestions.length,
        warningCount: result.warnings.length,
        hasQuery: Boolean(result.query?.trim()),
        hasLiteratureEvidence,
        isGenericFallback
      }
    });

    return result;
  } catch (error) {
    console.error('[EvidenceAdvice] Workflow execution failed:', error);
    await updateLangfuseTraceOutput({
      traceId,
      output: { error: error instanceof Error ? error.message : String(error), fallback: true }
    }).catch(() => {});
    await recordLangfuseScore({
      traceId,
      name: 'suggestions-count',
      value: 0,
      comment: 'Evidence advice workflow failed',
      source: 'MODEL',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    }).catch(() => {});
    return {
      query: '',
      suggestions: [],
      warnings: ['根拠取得に失敗しました。時間を置いて再試行してください。'],
      disclaimer: evidenceDisclaimer
    };
  }
}
