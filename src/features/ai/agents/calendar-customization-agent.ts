import { z } from 'zod';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { UserProfileContext } from '../types';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import type { AgentResult } from '../types';
import { getSystemPrompt } from '../evaluation/prompt-helper';

export const calendarCustomizationAgentDataSchema = z.object({
  customizedEvents: z.array(
    z.object({
      proposalId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      start: z.string().optional(), // ISO string
      end: z.string().optional(), // ISO string
      reasoning: z.string() // カスタマイズの理由
    })
  ),
  suggestions: z.array(
    z.object({
      type: z.enum(['time-adjustment', 'energy-optimization', 'conflict-resolution']),
      description: z.string(),
      affectedProposalIds: z.array(z.string())
    })
  )
});

export type CalendarCustomizationAgentData = z.infer<typeof calendarCustomizationAgentDataSchema>;

export type CalendarCustomizationAgentInput = {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  userProfile: UserProfileContext;
  routinePurpose?: string;
  /** 文献に基づくアドバイス。ある場合、カスタマイズの理由・提案に反映する */
  evidenceContext?: string;
};

export async function runCalendarCustomizationAgent({
  proposedEvents,
  existingEvents,
  userProfile,
  routinePurpose,
  evidenceContext
}: CalendarCustomizationAgentInput): Promise<AgentResult<CalendarCustomizationAgentData>> {
  // 既存イベントとの時間重複を検出（同一予定かどうかの判断は AI に任せるため、ここでは重複のみ）
  const conflictMap = new Map<string, CalendarEvent[]>();
  proposedEvents.forEach((proposed) => {
    const proposedStart = new Date(proposed.start);
    const proposedEnd = new Date(proposed.end);
    const conflicts = existingEvents.filter((existing) => {
      const existingStart = new Date(existing.start);
      const existingEnd = new Date(existing.end);
      return (
        (proposedStart >= existingStart && proposedStart < existingEnd) ||
        (proposedEnd > existingStart && proposedEnd <= existingEnd) ||
        (proposedStart <= existingStart && proposedEnd >= existingEnd)
      );
    });
    if (conflicts.length > 0) {
      conflictMap.set(proposed.proposalId, conflicts);
    }
  });

  // フォールバック（Bedrock 無効時）: 重複があれば「既存の最も遅い終了時刻の直後」から開始する（重複解消）
  const fallbackCustomizedEvents = proposedEvents.map((event) => {
    const conflicts = conflictMap.get(event.proposalId) ?? [];
    let customized = { ...event };
    let reasoning = '';

    if (conflicts.length > 0) {
      const originalStart = new Date(event.start);
      const originalEnd = new Date(event.end);
      const durationMs = originalEnd.getTime() - originalStart.getTime();
      const latestConflictEnd = new Date(
        Math.max(...conflicts.map((c) => new Date(c.end).getTime()))
      );
      const newStart = latestConflictEnd.getTime() <= originalStart.getTime()
        ? originalStart
        : latestConflictEnd;
      const newEnd = new Date(newStart.getTime() + durationMs);
      customized = {
        ...customized,
        start: newStart.toISOString(),
        end: newEnd.toISOString()
      };
      reasoning = `既存イベントとの競合を避けるため、既存予定の終了後から開始するようシフトしました。`;
    } else {
      const priorityLabel =
        userProfile.priorities.length > 0 ? `ユーザーの優先（${userProfile.priorities.slice(0, 2).join('、')}）` : 'ユーザー設定';
      reasoning = `${priorityLabel}と提案が一致しているため変更なし。`;
    }

    return {
      proposalId: event.proposalId,
      ...(customized.title !== event.title ? { title: customized.title } : {}),
      ...(customized.description !== event.description ? { description: customized.description } : {}),
      ...(customized.start !== event.start ? { start: customized.start } : {}),
      ...(customized.end !== event.end ? { end: customized.end } : {}),
      reasoning
    };
  });

  const conflictSuggestions = Array.from(conflictMap.keys()).map((proposalId) => ({
    type: 'conflict-resolution' as const,
    description: '既存イベントとの競合を検出しました。時間を調整することをおすすめします。',
    affectedProposalIds: [proposalId]
  }));
  const hasEvidence = Boolean(evidenceContext?.trim());
  const fallbackSuggestions =
    conflictSuggestions.length > 0
      ? conflictSuggestions
      : hasEvidence && proposedEvents.length > 0
        ? [
            {
              type: 'time-adjustment' as const,
              description: '文献を参照し、時間帯や休憩間隔の見直しを検討してください。',
              affectedProposalIds: proposedEvents.slice(0, 3).map((e) => e.proposalId)
            }
          ]
        : [];
  const fallbackData: CalendarCustomizationAgentData = {
    customizedEvents: fallbackCustomizedEvents,
    suggestions: fallbackSuggestions
  };

  // LLMによるカスタマイズ提案（根拠がある場合は参照する）
  const systemPrompt = await getSystemPrompt('calendar-customization-agent');
  const evidenceBlock = evidenceContext?.trim()
    ? `

【文献・根拠に基づくアドバイス（参照してカスタマイズの理由や提案に活かしてください）】
${evidenceContext}
`
    : '';

  const data = await invokeBedrockWithFallback(
    {
      systemPrompt,
      userPrompt: `
提案イベント:
${JSON.stringify(proposedEvents.map((e) => ({ id: e.proposalId, title: e.title, start: e.start, end: e.end })), null, 2)}

既存イベント:
${JSON.stringify(existingEvents.map((e) => ({ title: e.title, start: e.start, end: e.end })), null, 2)}

ユーザープロファイル:
- 優先順位: ${userProfile.priorities.join(', ') || '未設定'}
- 制約: ${userProfile.constraints.join(', ') || '未設定'}
- エネルギーレベル: ${userProfile.energyLevel}
- タイムゾーン: ${userProfile.timezone}
${userProfile.requiredSleepHours != null ? `\n- 必要睡眠時間: ${userProfile.requiredSleepHours}時間` : ''}
${userProfile.preferredWorkStartTime ? `\n- 希望活動開始時刻（これより前は避ける）: ${userProfile.preferredWorkStartTime}` : ''}
${userProfile.preferredWorkEndTime ? `\n- 希望活動終了時刻（これより後は避ける）: ${userProfile.preferredWorkEndTime}` : ''}
${userProfile.minBreakBetweenMinutes != null ? `\n- 連続イベント間の最小休憩: ${userProfile.minBreakBetweenMinutes}分` : ''}

Routineの目的:
${routinePurpose ? routinePurpose : '未設定'}
${evidenceBlock}
      `,
      schema: calendarCustomizationAgentDataSchema,
      shapeExample: JSON.stringify(fallbackData),
      temperature: 0.3
    },
    () => fallbackData
  );

  return {
    agent: isBedrockEnabled() ? 'bedrock/calendar-customization-agent' : 'heuristic/calendar-customization-agent',
    generatedAt: new Date().toISOString(),
    data
  };
}
