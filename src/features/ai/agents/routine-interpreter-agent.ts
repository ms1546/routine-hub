import type { Routine } from '@/features/routines';
import type { AgentResult, InterpretationAgentData, ProfileAgentData } from '../types';
import { interpretationAgentDataSchema } from '../schemas';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import { getSystemPrompt } from '../evaluation/prompt-helper';
import { routineSchemaTool } from '../tools/routine-schema-tool';

export type RoutineInterpreterAgentInput = {
  routine: Routine;
  profileSummary: ProfileAgentData;
};

export async function runRoutineInterpreterAgent({
  routine,
  profileSummary
}: RoutineInterpreterAgentInput): Promise<AgentResult<InterpretationAgentData>> {
  const routineSummary = routineSchemaTool(routine);
  const fallbackData: InterpretationAgentData = {
    intent: [`${routine.name} は「${routine.purpose}」を狙うルーチン。`],
    successSignals: ['各ブロックは最低3時間を維持', `公開範囲: ${routine.visibility}`, `期間: ${routine.durationType}`],
    riskSignals: routine.timeBlocks.length > 4 ? ['ブロック数が多く、疲労リスクがある'] : []
  };

  const systemPrompt = await getSystemPrompt('routine-interpreter-agent');
  const data = await invokeBedrockWithFallback(
    {
      systemPrompt,
      userPrompt:
        '以下の構造化ルーチン情報とユーザーペルソナを前提に、意図・成功条件・リスク要因を要約してください。\n\n' +
        `【ルーチン概要】\n` +
        `ID: ${routineSummary.id}\n` +
        `名前: ${routineSummary.name}\n` +
        `目的: ${routineSummary.purpose}\n` +
        `期間タイプ: ${routineSummary.durationType}\n` +
        `公開範囲: ${routineSummary.visibility}\n` +
        `通常時間帯: ${routineSummary.normalStartHour ?? '?'}〜${routineSummary.normalEndHour ?? '?'}\n` +
        `タグ: ${routineSummary.tags.join(', ') || 'なし'}\n\n` +
        `【ブロック一覧】\n` +
        routineSummary.timeBlocks
          .map(
            (b) =>
              `- ${b.day} ${b.startHour}:00〜${b.endHour}:00 ${b.label}${
                b.objective ? `（目的: ${b.objective}）` : ''
              }${b.energyLevel ? ` [エネルギー: ${b.energyLevel}]` : ''}`
          )
          .join('\n') +
        `\n\n【ユーザーペルソナ】\n${profileSummary.persona}`,
      schema: interpretationAgentDataSchema,
      shapeExample: JSON.stringify(fallbackData),
      temperature: 0.3
    },
    () => fallbackData
  );

  return {
    agent: isBedrockEnabled() ? 'bedrock/routine-interpreter-agent' : 'heuristic/routine-interpreter-agent',
    generatedAt: new Date().toISOString(),
    data
  };
}
