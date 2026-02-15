import type { Routine } from '@/features/routines';
import type {
  AgentResult,
  OptimizationAgentData,
  ProfileAgentData,
  ConflictAgentData,
  InterpretationAgentData
} from '../types';
import { optimizationAgentDataSchema } from '../schemas';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import { getSystemPrompt } from '../evaluation/prompt-helper';

export type OptimizationAgentInput = {
  routine: Routine;
  profile: AgentResult<ProfileAgentData>;
  interpretation: AgentResult<InterpretationAgentData>;
  conflicts: AgentResult<ConflictAgentData>;
};

export async function runOptimizationAgent({
  routine,
  profile,
  interpretation,
  conflicts
}: OptimizationAgentInput): Promise<AgentResult<OptimizationAgentData>> {
  const fallbackData: OptimizationAgentData = {
    proposals: [
      {
        id: 'maintain-buffer',
        title: 'カレンダー反映前の確認バッファ',
        description: 'Google カレンダーへ書き込む24時間前に手動確認のステップを入れる。',
        tradeOffs: ['確定が遅れる', '予定破壊を防げる'],
        aiOnly: false
      },
      {
        id: 'energy-mapping',
        title: 'エネルギーマッピング',
        description: `${profile.data.persona} のトーンガイダンスに合わせて各ブロックの強度を調整する。`,
        tradeOffs: ['タグ付けの手間が増える', 'ミスマッチを軽減できる'],
        aiOnly: true
      }
    ]
  };

  const systemPrompt = await getSystemPrompt('optimization-agent');
  const data = await invokeBedrockWithFallback(
    {
      systemPrompt,
      userPrompt: `ルーチン: ${routine.name}\n意図: ${interpretation.data.intent}\n衝突: ${
        conflicts.data.conflicts.map((c) => `${c.label}(${c.severity})`).join(', ') || 'なし'
      }\nペルソナ: ${profile.data.persona}`,
      schema: optimizationAgentDataSchema,
      shapeExample: JSON.stringify(fallbackData),
      temperature: 0.4
    },
    () => fallbackData
  );

  return {
    agent: isBedrockEnabled() ? 'bedrock/optimization-agent' : 'heuristic/optimization-agent',
    generatedAt: new Date().toISOString(),
    data
  };
}
