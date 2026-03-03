/**
 * カレンダーカスタマイズの実行コア（Trace 記録込み）。
 * 通常の Action と Experiment API の両方から利用する。
 */
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { UserProfileContext } from '@/features/ai/types';
import { mastraRepository } from '@/features/ai/mastra/repository';
import {
  recordLangfuseTrace,
  recordLangfuseScore,
  updateLangfuseTraceOutput
} from '@/features/ai/evaluation/langfuse-boundary';
import { getSystemPromptInfo } from '@/features/ai/evaluation/prompt-helper';
import { evaluateCalendarCustomization } from '@/features/ai/evaluation/judge';
import { isBedrockEnabled } from '@/features/ai/providers/bedrock';
import type { CalendarCustomizationResult } from './calendar-customization';

type CustomizedEventItem = CalendarCustomizationResult['customizedEvents'][number];

/** 提案イベント＋カスタマイズをマージしたリストを日付ごとにソートし、同日内の時間重複を解消する */
function resolveOverlapsAmongCustomized(
  proposedEvents: ProposedCalendarEvent[],
  customizedEvents: CustomizedEventItem[]
): CustomizedEventItem[] {
  const byId = new Map(customizedEvents.map((c) => [c.proposalId, c]));
  const merged: Array<{ proposalId: string; start: string; end: string }> = proposedEvents.map((e) => {
    const c = byId.get(e.proposalId);
    return {
      proposalId: e.proposalId,
      start: c?.start ?? e.start,
      end: c?.end ?? e.end
    };
  });

  const dateKey = (iso: string) => iso.slice(0, 10);
  const byDate = new Map<string, typeof merged>();
  merged.forEach((ev) => {
    const key = dateKey(ev.start);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(ev);
  });

  const gapMs = 0;
  const resolved = new Map<string, { start: string; end: string }>();

  byDate.forEach((events) => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    let lastEnd = 0;
    sorted.forEach((ev) => {
      const startMs = new Date(ev.start).getTime();
      const endMs = new Date(ev.end).getTime();
      const durationMs = Math.max(0, endMs - startMs);
      let newStart = startMs;
      if (startMs < lastEnd) {
        newStart = lastEnd + gapMs;
      }
      const newEnd = newStart + durationMs;
      lastEnd = newEnd;
      resolved.set(ev.proposalId, {
        start: new Date(newStart).toISOString(),
        end: new Date(newEnd).toISOString()
      });
    });
  });

  return customizedEvents.map((c) => {
    const r = resolved.get(c.proposalId);
    if (!r) return c;
    const orig = merged.find((m) => m.proposalId === c.proposalId)!;
    const changed = orig.start !== r.start || orig.end !== r.end;
    if (!changed) return c;
    return {
      ...c,
      start: r.start,
      end: r.end,
      reasoning:
        c.reasoning?.includes('重複解消') ? c.reasoning : '提案イベント同士の重複を解消するため時間を調整しました。'
    };
  });
}

export type CalendarCustomizationRunInput = {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  userProfile: UserProfileContext;
  routinePurpose?: string;
  evidenceContext?: string;
};

/**
 * 指定した input と traceId でカスタマイズを実行し、Langfuse に Trace を記録する。
 * @returns カスタマイズ結果（失敗時はフォールバック結果）
 */
export async function runCalendarCustomizationWithTrace(
  input: CalendarCustomizationRunInput,
  traceId: string
): Promise<CalendarCustomizationResult> {
  const { proposedEvents, existingEvents, userProfile, routinePurpose, evidenceContext } = input;

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
      routineId: undefined,
      proposedEventCount: proposedEvents.length,
      existingEventCount: existingEvents.length,
      promptVersions,
      bedrockEnabled: isBedrockEnabled(),
      // Dataset に追加したときに再実行できるよう run input を含める
      runInput: {
        proposedEvents,
        existingEvents,
        userProfile,
        routinePurpose,
        evidenceContext: evidenceContext ?? undefined
      }
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

    let result = runResult.result;
    result = {
      ...result,
      customizedEvents: resolveOverlapsAmongCustomized(proposedEvents, result.customizedEvents)
    };
    const hasEvidenceContext = Boolean(evidenceContext?.trim());
    const evidenceIsGeneric =
      hasEvidenceContext && (evidenceContext?.includes('一般的な観点') ?? false);

    type CustomizedEvent = CalendarCustomizationResult['customizedEvents'][number];
    const conflictAdjustedCount = result.customizedEvents.filter(
      (c: CustomizedEvent) => c.start != null || c.end != null
    ).length;

    await updateLangfuseTraceOutput({
      traceId,
      output: { customizedEvents: result.customizedEvents, suggestions: result.suggestions }
    });

    await recordLangfuseScore({
      traceId,
      name: 'customized-events-count',
      value: result.customizedEvents.length,
      comment: `Calendar customization: ${result.customizedEvents.length} event(s), ${result.suggestions.length} suggestion(s), ${conflictAdjustedCount} adjusted`,
      source: 'MODEL',
      metadata: {
        customizedCount: result.customizedEvents.length,
        suggestionCount: result.suggestions.length,
        conflictAdjustedCount,
        hasEvidenceContext,
        evidenceIsGeneric
      }
    });
    await recordLangfuseScore({
      traceId,
      name: 'conflict-adjusted-count',
      value: conflictAdjustedCount,
      source: 'MODEL'
    });
    await recordLangfuseScore({
      traceId,
      name: 'suggestions-count',
      value: result.suggestions.length,
      source: 'MODEL'
    });

    if (hasEvidenceContext) {
      const reasoningText = result.customizedEvents
        .map((c: CustomizedEvent) => c.reasoning)
        .join(' ');
      const evidenceReferenced =
        !evidenceIsGeneric &&
        (reasoningText.includes('文献') ||
          reasoningText.includes('研究') ||
          reasoningText.includes('根拠'));
      await recordLangfuseScore({
        traceId,
        name: 'evidence-referenced',
        value: evidenceReferenced ? 1 : 0,
        source: 'MODEL'
      });
    }

    const existingEventsSummary =
      existingEvents.length === 0
        ? '既存予定なし'
        : `${existingEvents.length}件: ${existingEvents
            .slice(0, 10)
            .map((e) => `${e.title ?? '無題'} (${e.start ?? ''}–${e.end ?? ''})`)
            .join('; ')}${existingEvents.length > 10 ? '...' : ''}`;

    // Judge は応答をブロックしないようバックグラウンドで実行（体感速度のため）
    void (async () => {
      try {
        const judgeResult = await evaluateCalendarCustomization({
          userProfile,
          routinePurpose,
          evidenceContext: evidenceContext ?? undefined,
          existingEventsSummary,
          customizedEvents: result.customizedEvents,
          suggestions: result.suggestions
        });
        await recordLangfuseScore({
          traceId,
          name: 'purpose-preserving',
          value: judgeResult.purposePreserving,
          source: 'MODEL',
          comment: judgeResult.purposePreservingRationale
            ? `[LLM Judge] ${judgeResult.purposePreservingRationale}`
            : undefined,
          metadata: { source: 'llm-judge' }
        });
        await recordLangfuseScore({
          traceId,
          name: 'evidence-applied',
          value: judgeResult.evidenceApplied,
          source: 'MODEL',
          comment: judgeResult.evidenceAppliedRationale
            ? `[LLM Judge] ${judgeResult.evidenceAppliedRationale}`
            : undefined,
          metadata: { source: 'llm-judge' }
        });
        await recordLangfuseScore({
          traceId,
          name: 'user-settings-respected',
          value: judgeResult.userSettingsRespected,
          source: 'MODEL',
          comment: judgeResult.userSettingsRespectedRationale
            ? `[LLM Judge] ${judgeResult.userSettingsRespectedRationale}`
            : undefined,
          metadata: { source: 'llm-judge' }
        });
      } catch (judgeError) {
        console.warn('[CalendarCustomization] Judge evaluation failed, skipping judge scores.', judgeError);
      }
    })();

    return result;
  } catch (error) {
    console.error('[CalendarCustomization] Workflow execution failed:', error);
    await updateLangfuseTraceOutput({
      traceId,
      output: {
        error: error instanceof Error ? error.message : String(error),
        fallback: true
      }
    }).catch(() => {});
    await recordLangfuseScore({
      traceId,
      name: 'customized-events-count',
      value: 0,
      comment: 'Calendar customization workflow failed',
      source: 'MODEL',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    }).catch(() => {});
    return {
      customizedEvents: proposedEvents.map((event) => ({
        proposalId: event.proposalId,
        reasoning: 'カスタマイズWorkflowの実行に失敗しました。元のイベントをそのまま使用します。'
      })),
      suggestions: []
    };
  }
}
