import type {
  AgentResult,
  FutureSimulationData,
  OptimizationAgentData,
  ProfileAgentData
} from '../types';
import { futureSimulationDataSchema } from '../schemas';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import { getSystemPrompt } from '../evaluation/prompt-helper';

export type FutureSimulationAgentInput = {
  routineName: string;
  optimizations: AgentResult<OptimizationAgentData>;
  profile: AgentResult<ProfileAgentData>;
};

export async function runFutureSimulationAgent({
  routineName,
  optimizations,
  profile
}: FutureSimulationAgentInput): Promise<AgentResult<FutureSimulationData>> {
  const fallbackData: FutureSimulationData = {
    outlook: `${routineName} を適用すると、提案 ${optimizations.data.proposals.length} 件に基づいた計画が安定します。`,
    guardrails: [
      'AI の提案は必ずユーザーが確認する',
      '事前に検知した衝突を解決するまでは書き込まない',
      `推奨トーン: ${profile.data.toneGuidance}`
    ],
    followUpQuestions: ['直近で変化した制約はあるか？', '他カレンダーとの整合は取れているか？']
  };

  const systemPrompt = await getSystemPrompt('future-simulation-agent');
  const data = await invokeBedrockWithFallback(
    {
      systemPrompt,
      userPrompt: `ルーチン: ${routineName}\nトーンガイダンス: ${profile.data.toneGuidance}\n提案一覧: ${optimizations.data.proposals
        .map((p) => p.title)
        .join(', ')}`,
      schema: futureSimulationDataSchema,
      shapeExample: JSON.stringify(fallbackData),
      temperature: 0.5
    },
    () => fallbackData
  );

  return {
    agent: isBedrockEnabled() ? 'bedrock/future-simulation-agent' : 'heuristic/future-simulation-agent',
    generatedAt: new Date().toISOString(),
    data
  };
}
