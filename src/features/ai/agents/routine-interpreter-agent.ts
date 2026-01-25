import type { Routine } from '@/features/routines';
import type {
  AgentResult,
  InterpretationAgentData,
  ProfileAgentData
} from '../types';
import { interpretationAgentDataSchema } from '../schemas';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import { getSystemPrompt } from '../evaluation/prompt-helper';

export type RoutineInterpreterAgentInput = {
  routine: Routine;
  profileSummary: ProfileAgentData;
};

export async function runRoutineInterpreterAgent({
  routine,
  profileSummary
}: RoutineInterpreterAgentInput): Promise<AgentResult<InterpretationAgentData>> {
  const fallbackData: InterpretationAgentData = {
    intent: [`${routine.name} は「${routine.purpose}」を狙うルーチン。`],
    successSignals: ['各ブロックは最低3時間を維持', `公開範囲: ${routine.visibility}`, `期間: ${routine.durationType}`],
    riskSignals: routine.timeBlocks.length > 4 ? ['ブロック数が多く、疲労リスクがある'] : []
  };

  const systemPrompt = await getSystemPrompt('routine-interpreter-agent');
  const data = await invokeBedrockWithFallback(
    {
      systemPrompt,
      userPrompt: `ルーチン名: ${routine.name}\nタグ: ${routine.tags.join(', ')}\n目的: ${routine.purpose}\nユーザーペルソナ: ${profileSummary.persona}`,
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
