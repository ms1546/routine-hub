import type {
  AgentResult,
  JudgeEvaluation,
  OptimizationAgentData,
  FutureSimulationData,
  ConflictAgentData
} from '../types';

const scoreDimension = (weight: number, count: number) => {
  const score = Math.min(5, Math.max(1, Math.round(weight + count)));
  return score;
};

export async function evaluateWorkflow(
  input: {
    optimizations: AgentResult<OptimizationAgentData>;
    conflicts: AgentResult<ConflictAgentData>;
    futureSimulation: AgentResult<FutureSimulationData>;
  }
): Promise<AgentResult<JudgeEvaluation>> {
  const clarityScore = scoreDimension(2, input.conflicts.data.conflicts.length / 2 + 1);
  const consistencyScore = scoreDimension(2, input.optimizations.data.proposals.length / 3);
  const explanationScore = scoreDimension(2, input.futureSimulation.data.guardrails.length / 2);

  const verdict = clarityScore >= 3 && consistencyScore >= 3 ? 'approve' : 'revise';

  return {
    agent: 'llm-judge',
    generatedAt: new Date().toISOString(),
    data: {
      clarity: {
        score: clarityScore,
        rationale: '制約の網羅状況を基準に採点。'
      },
      consistency: {
        score: consistencyScore,
        rationale: '提案と意図の整合度合いからスコア算出。'
      },
      explanationQuality: {
        score: explanationScore,
        rationale: '提示されたオプティマイズ案の多様性で評価。'
      },
      verdict
    }
  };
}
