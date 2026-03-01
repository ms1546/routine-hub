/**
 * カレンダー適用方針エージェント
 *
 * 提案イベントと既存予定を比較し、各提案について
 * insert（新規挿入・必要なら推奨時刻） / merge（既存と同一とみなし更新） / skip（挿入しない）
 * を決定する。
 */

import { z } from 'zod';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import { getSystemPrompt } from '../evaluation/prompt-helper';

export const applyResolutionItemSchema = z.object({
  proposalId: z.string(),
  action: z.enum(['insert', 'merge', 'skip']),
  recommendedStart: z.string().optional(),
  recommendedEnd: z.string().optional(),
  existingEventId: z.string().optional(),
  reason: z.string().optional()
});

export const calendarApplyResolutionSchema = z.object({
  resolutions: z.array(applyResolutionItemSchema)
});

export type ApplyResolutionItem = z.infer<typeof applyResolutionItemSchema>;

export type CalendarApplyResolutionAgentInput = {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  routineId: string;
};

/**
 * ヒューリスティック: 既存予定と時間重複があれば insert（推奨時刻は空＝元のまま）、
 * 同じ routineId + blockId の既存があれば merge、それ以外は insert。
 */
function heuristicResolutions(
  proposedEvents: ProposedCalendarEvent[],
  existingEvents: CalendarEvent[],
  routineId: string
): ApplyResolutionItem[] {
  const result: ApplyResolutionItem[] = [];

  for (const prop of proposedEvents) {
    const propStart = new Date(prop.start).getTime();
    const propEnd = new Date(prop.end).getTime();

    const sameRoutineBlock = existingEvents.find(
      (e) =>
        e.source?.routineId === routineId &&
        e.source?.blockId === prop.blockId &&
        (e.source?.proposalId === prop.proposalId || e.title === prop.title)
    );

    if (sameRoutineBlock) {
      result.push({
        proposalId: prop.proposalId,
        action: 'merge',
        existingEventId: sameRoutineBlock.id,
        reason: '同じルーチン・同一ブロックの既存予定とマージ'
      });
      continue;
    }

    const overlapping = existingEvents.some((e) => {
      const eStart = new Date(e.start).getTime();
      const eEnd = new Date(e.end).getTime();
      return propStart < eEnd && propEnd > eStart;
    });

    if (overlapping) {
      result.push({
        proposalId: prop.proposalId,
        action: 'insert',
        recommendedStart: prop.start,
        recommendedEnd: prop.end,
        reason: '既存予定と重複の可能性あり。元の時刻で挿入を試行'
      });
    } else {
      result.push({
        proposalId: prop.proposalId,
        action: 'insert',
        reason: '重複なし'
      });
    }
  }

  return result;
}

export async function runCalendarApplyResolutionAgent({
  proposedEvents,
  existingEvents,
  routineId
}: CalendarApplyResolutionAgentInput): Promise<ApplyResolutionItem[]> {
  if (proposedEvents.length === 0) {
    return [];
  }

  const systemPrompt = await getSystemPrompt('calendar-apply-resolution-agent').catch(() => FALLBACK_PROMPT);

  const proposedSummary = proposedEvents.map((e) => ({
    proposalId: e.proposalId,
    blockId: e.blockId,
    title: e.title,
    start: e.start,
    end: e.end
  }));
  const existingSummary = existingEvents.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    routineId: e.source?.routineId,
    blockId: e.source?.blockId,
    proposalId: e.source?.proposalId
  }));

  const fallbackResult = heuristicResolutions(proposedEvents, existingEvents, routineId);

  if (!isBedrockEnabled()) {
    return fallbackResult;
  }

  const data = await invokeBedrockWithFallback(
    {
      systemPrompt,
      userPrompt: `
提案イベント（このルーチンから適用したい）:
${JSON.stringify(proposedSummary, null, 2)}

既存カレンダー予定:
${JSON.stringify(existingSummary, null, 2)}

上記の各提案イベントについて、次のいずれかを決めてください。
- insert: 新規挿入。既存と時間が重なっている場合は、空き時間への推奨時刻（recommendedStart, recommendedEnd）を ISO 文字列で示してください。重なっていなければ recommendedStart/End は省略可。
- merge: 既存予定と「同じ内容」とみなす場合。existingEventId に既存の id を指定。同じルーチン（routineId）・同じブロック（blockId）由来の既存予定があるときにマージを選んでください。
- skip: 挿入しない（全日詰まっている等）。reason に理由を書いてください。

必ず提案イベントの proposalId ごとに1件ずつ resolutions を出力し、action は insert / merge / skip のいずれかにしてください。
`,
      schema: calendarApplyResolutionSchema,
      shapeExample: JSON.stringify({
        resolutions: [
          { proposalId: 'xxx', action: 'insert', reason: '重複なし' },
          { proposalId: 'yyy', action: 'merge', existingEventId: 'existing-id', reason: '同一ブロックの既存とマージ' },
          { proposalId: 'zzz', action: 'skip', reason: '該当日の空きがありません' }
        ]
      }),
      temperature: 0.2,
      maxTokens: 2000
    },
    () => ({ resolutions: fallbackResult })
  );

  const byProposalId = new Map((data.resolutions ?? []).map((r) => [r.proposalId, r]));
  return proposedEvents.map((p) => byProposalId.get(p.proposalId) ?? { proposalId: p.proposalId, action: 'insert' as const });
}

const FALLBACK_PROMPT =
  'You decide for each proposed calendar event whether to insert (new), merge (update existing event with same routine/block), or skip. Output JSON with resolutions array.';
