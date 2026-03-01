'use server';

import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { UserProfileContext } from '@/features/ai/types';
import { userSettingsRepository } from '@/features/users';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { mastraRepository } from '@/features/ai/mastra/repository';
import { routinesRepository } from '@/features/routines';
import {
  recordLangfuseTrace,
  recordLangfuseScore,
  updateLangfuseTraceOutput
} from '@/features/ai/evaluation/langfuse-boundary';
import { getSystemPromptInfo } from '@/features/ai/evaluation/prompt-helper';
import { isBedrockEnabled } from '@/features/ai/providers/bedrock';

const generateUUID = createDefaultUUIDGenerator();

/** 既存予定と時間が重なっている proposalId の集合を返す */
function getConflictingProposalIds(
  proposedEvents: { proposalId: string; start: string; end: string }[],
  existingEvents: { start: string; end: string }[]
): Set<string> {
  const conflictIds = new Set<string>();
  for (const prop of proposedEvents) {
    const propStart = new Date(prop.start).getTime();
    const propEnd = new Date(prop.end).getTime();
    const hasConflict = existingEvents.some((e) => {
      const eStart = new Date(e.start).getTime();
      const eEnd = new Date(e.end).getTime();
      return propStart < eEnd && propEnd > eStart;
    });
    if (hasConflict) conflictIds.add(prop.proposalId);
  }
  return conflictIds;
}

/** 衝突しているが LLM が start/end を返していない提案に、30分ずらしをマージする */
function mergeConflictFallback(
  customizedEvents: CalendarCustomizationResult['customizedEvents'],
  proposedEvents: ProposedCalendarEvent[],
  conflictingIds: Set<string>
): CalendarCustomizationResult['customizedEvents'] {
  const proposedById = new Map(proposedEvents.map((p) => [p.proposalId, p]));
  return customizedEvents.map((c) => {
    if (!conflictingIds.has(c.proposalId)) return c;
    if (c.start != null && c.end != null) return c;
    const prop = proposedById.get(c.proposalId);
    if (!prop) return c;
    const start = new Date(prop.start);
    start.setMinutes(start.getMinutes() + 30);
    const end = new Date(prop.end);
    end.setMinutes(end.getMinutes() + 30);
    const fallbackReason = '既存予定との競合を避けるため、30分後ろにシフトしました。';
    return {
      ...c,
      start: c.start ?? start.toISOString(),
      end: c.end ?? end.toISOString(),
      reasoning: c.reasoning ? `${c.reasoning} ${fallbackReason}` : fallbackReason
    };
  });
}

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
      promptVersions,
      bedrockEnabled: isBedrockEnabled()
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

    // 衝突しているのに LLM が start/end を返していない提案に、30分ずらしをマージ
    const conflictingIds = getConflictingProposalIds(proposedEvents, existingEvents);
    const mergedCustomizedEvents = mergeConflictFallback(
      result.customizedEvents,
      proposedEvents,
      conflictingIds
    );
    const finalResult: CalendarCustomizationResult = {
      customizedEvents: mergedCustomizedEvents,
      suggestions: result.suggestions
    };

    await updateLangfuseTraceOutput({
      traceId,
      output: {
        customizedEvents: finalResult.customizedEvents,
        suggestions: finalResult.suggestions
      }
    });

    await recordLangfuseScore({
      traceId,
      name: 'customized-events-count',
      value: finalResult.customizedEvents.length,
      comment: `Calendar customization: ${finalResult.customizedEvents.length} event(s), ${finalResult.suggestions.length} suggestion(s)`,
      source: 'MODEL',
      metadata: {
        customizedCount: finalResult.customizedEvents.length,
        suggestionCount: finalResult.suggestions.length,
        hasEvidenceContext,
        evidenceIsGeneric
      }
    });

    return finalResult;
  } catch (error) {
    console.error('[CalendarCustomization] Workflow execution failed:', error);
    await updateLangfuseTraceOutput({
      traceId,
      output: { error: error instanceof Error ? error.message : String(error), fallback: true }
    }).catch(() => {});
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
