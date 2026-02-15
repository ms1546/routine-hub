import type { Routine } from '@/features/routines';
import type {
  AgentResult,
  ConflictAgentData,
  InterpretationAgentData,
  UserProfileContext,
  CalendarWindow
} from '../types';
import { conflictAgentDataSchema } from '../schemas';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import { getSystemPrompt } from '../evaluation/prompt-helper';

export type CalendarConflictAgentInput = {
  routine: Routine;
  interpretedRoutineIntent: InterpretationAgentData;
  userProfile: UserProfileContext;
  calendarWindow: CalendarWindow;
};

export async function runCalendarConflictAgent({
  routine,
  interpretedRoutineIntent,
  userProfile,
  calendarWindow
}: CalendarConflictAgentInput): Promise<AgentResult<ConflictAgentData>> {
  const conflicts: ConflictAgentData['conflicts'] = [];
  const earlyBlocks = routine.timeBlocks.filter((block) => block.startHour < 8);
  if (earlyBlocks.length) {
    conflicts.push({
      id: 'early-start',
      label: '早朝ブロックの圧迫',
      severity: 'medium',
      rationale: '08:00 前に開始するブロックがあり、支度時間と衝突する恐れがある。'
    });
  }

  if (userProfile.constraints.some((c) => c.toLowerCase().includes('travel'))) {
    conflicts.push({
      id: 'travel-buffer',
      label: '移動日のバッファ',
      severity: 'low',
      rationale: '「travel」に言及があるため、カレンダー反映前に移動日のバッファを設ける。'
    });
  }

  const fallbackData: ConflictAgentData = {
    conflicts,
    assumptions: [`${calendarWindow.startDate}〜${calendarWindow.endDate} の期間では、${interpretedRoutineIntent.intent} を守るため手動確認が必要。`]
  };

  const systemPrompt = await getSystemPrompt('calendar-conflict-agent');
  const data = await invokeBedrockWithFallback(
    {
      systemPrompt,
      userPrompt: `ルーチン: ${routine.name}\n意図: ${interpretedRoutineIntent.intent}\n期間: ${calendarWindow.startDate}〜${calendarWindow.endDate}\nユーザー制約: ${userProfile.constraints.join(', ') || 'なし'}`,
      schema: conflictAgentDataSchema,
      shapeExample: JSON.stringify(fallbackData),
      temperature: 0.2
    },
    () => ({ ...fallbackData, conflicts })
  );

  return {
    agent: isBedrockEnabled() ? 'bedrock/calendar-conflict-agent' : 'heuristic/calendar-conflict-agent',
    generatedAt: new Date().toISOString(),
    data
  };
}
