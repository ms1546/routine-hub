'use server';

import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { UserProfileContext } from '@/features/ai/types';
import { userSettingsRepository } from '@/features/users';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { mastraRepository } from '@/features/ai/mastra/repository';
import { routinesRepository } from '@/features/routines';
import { recordLangfuseTrace, recordLangfuseScore } from '@/features/ai/evaluation/langfuse-boundary';
import { getSystemPromptInfo } from '@/features/ai/evaluation/prompt-helper';

const generateUUID = createDefaultUUIDGenerator();

export type CalendarCustomizationResult = {
  customizedEvents: Array<{
    proposalId: string;
    title?: string;
    description?: string;
    start?: string;
    end?: string;
    reasoning: string;
  }>;
  suggestions: Array<{
    type: 'time-adjustment' | 'energy-optimization' | 'conflict-resolution';
    description: string;
    affectedProposalIds: string[];
  }>;
};

export async function customizeCalendarEventsAction({
  proposedEvents,
  existingEvents,
  routineId,
  /** 文献に基づくアドバイス。渡すとカスタマイズの判断に参照される */
  evidenceContext
}: {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  routineId?: string;
  evidenceContext?: string;
}): Promise<CalendarCustomizationResult> {
  const currentUser = await getCurrentUser();

  // ユーザー設定を取得（なければデフォルト値で作成）
  const settings = await userSettingsRepository.getOrCreate(currentUser.id, {
    displayName: currentUser.displayName,
    timezone: 'Asia/Tokyo',
    requiredSleepHours: 7,
    priorities: ['集中時間を守る', 'カレンダーの権威を尊重'],
    constraints: ['手動確認を好む'],
    energyLevel: 'medium'
  });

  const userProfile: UserProfileContext = {
    timezone: settings.timezone,
    requiredSleepHours: settings.requiredSleepHours,
    preferredWorkStartTime: settings.preferredWorkStartTime,
    preferredWorkEndTime: settings.preferredWorkEndTime,
    minBreakBetweenMinutes: settings.minBreakBetweenMinutes,
    priorities: settings.priorities,
    constraints: settings.constraints,
    energyLevel: settings.energyLevel
  };

  // Routine情報を取得（目的を参照するため）
  let routinePurpose: string | undefined;
  if (routineId) {
    try {
      const routine = await routinesRepository.get(
        routineId,
        currentUser.id,
        currentUser.email,
        currentUser.role === 'admin'
      );
      routinePurpose = routine?.purpose;
    } catch (error) {
      console.warn('[CalendarCustomization] Failed to fetch routine:', error);
    }
  }

  const traceId = generateUUID();
  let promptVersions: Record<string, { version?: number; labels?: string[]; source: string }> = {};
  try {
    const promptInfo = await getSystemPromptInfo('calendar-customization-agent');
    promptVersions['calendar-customization-agent'] = {
      version: promptInfo.version,
      labels: promptInfo.labels,
      source: promptInfo.source
    };
  } catch {
    // プロンプト取得に失敗してもワークフロー実行は継続
  }

  await recordLangfuseTrace({
    workflow: 'calendar-customization-workflow',
    payload: {
      executionId: traceId,
      routineId: routineId ?? undefined,
      proposedEventCount: proposedEvents.length,
      existingEventCount: existingEvents.length,
      promptVersions
    },
    traceId
  });

  try {
    const workflow = mastraRepository.getWorkflows().calendarCustomizationWorkflow;
    if (!workflow) {
      throw new Error('Calendar customization workflow is not registered in Mastra repository');
    }

    const run = await workflow.createRunAsync();
    const runResult = await run.start({
      inputData: {
        proposedEvents,
        existingEvents,
        userProfile,
        routinePurpose,
        evidenceContext: evidenceContext ?? undefined
      },
      tracingOptions: { traceId }
    });

    if (runResult.status !== 'success' || !runResult.result) {
      throw new Error('Calendar customization workflow execution failed');
    }

    const result = runResult.result;
    const hasEvidenceContext = Boolean(evidenceContext?.trim());
    const evidenceIsGeneric = hasEvidenceContext && (evidenceContext?.includes('一般的な観点') ?? false);
    await recordLangfuseScore({
      traceId,
      name: 'customized-events-count',
      value: result.customizedEvents.length,
      comment: `Calendar customization: ${result.customizedEvents.length} event(s), ${result.suggestions.length} suggestion(s)`,
      source: 'MODEL',
      metadata: {
        customizedCount: result.customizedEvents.length,
        suggestionCount: result.suggestions.length,
        hasEvidenceContext,
        evidenceIsGeneric
      }
    });

    return result;
  } catch (error) {
    console.error('[CalendarCustomization] Workflow execution failed:', error);
    await recordLangfuseScore({
      traceId,
      name: 'customized-events-count',
      value: 0,
      comment: 'Calendar customization workflow failed',
      source: 'MODEL',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    }).catch(() => {});
    // フォールバック: カスタマイズなしで元のイベントを返す
    return {
      customizedEvents: proposedEvents.map((event) => ({
        proposalId: event.proposalId,
        reasoning: 'カスタマイズWorkflowの実行に失敗しました。元のイベントをそのまま使用します。'
      })),
      suggestions: []
    };
  }
}
