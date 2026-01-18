import { z } from 'zod';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { UserProfileContext } from '../types';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import type { AgentResult } from '../types';

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
  routinePurpose?: string; // Routineの目的を追加
};

export async function runCalendarCustomizationAgent({
  proposedEvents,
  existingEvents,
  userProfile,
  routinePurpose
}: CalendarCustomizationAgentInput): Promise<AgentResult<CalendarCustomizationAgentData>> {
  // 既存イベントとの競合を検出
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

  // フォールバックデータ（ヒューリスティックなカスタマイズ）
  const fallbackCustomizedEvents = proposedEvents.map((event) => {
    const conflicts = conflictMap.get(event.proposalId) ?? [];
    let customized = { ...event };
    let reasoning = '';

    if (conflicts.length > 0) {
      // 競合がある場合は、30分後ろにシフト
      const originalStart = new Date(event.start);
      originalStart.setMinutes(originalStart.getMinutes() + 30);
      const originalEnd = new Date(event.end);
      originalEnd.setMinutes(originalEnd.getMinutes() + 30);

      customized = {
        ...customized,
        start: originalStart.toISOString(),
        end: originalEnd.toISOString()
      };
      reasoning = `既存イベントとの競合を避けるため、30分後ろにシフトしました。`;
    } else {
      reasoning = 'カスタマイズの必要はありませんでした。';
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

  const fallbackData: CalendarCustomizationAgentData = {
    customizedEvents: fallbackCustomizedEvents,
    suggestions: Array.from(conflictMap.keys()).map((proposalId) => ({
      type: 'conflict-resolution' as const,
      description: '既存イベントとの競合を検出しました。時間を調整することをおすすめします。',
      affectedProposalIds: [proposalId]
    }))
  };

  // LLMによるカスタマイズ提案
  const data = await invokeBedrockWithFallback(
    {
      systemPrompt:
        'あなたは Routine Hub のカレンダーカスタマイズ担当です。ユーザーのプロファイル、Routineの目的、既存のカレンダーイベントを考慮して、提案されたイベントを個人に最適化してください。時間調整、エネルギーレベルに基づく最適化、競合解決を提案してください。',
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

Routineの目的:
${routinePurpose ? routinePurpose : '未設定'}
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
