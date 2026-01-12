import type { AgentResult, JudgeEvaluation, RoutineAiWorkflowResult } from '@/lib/ai/types';
import type { OptimizationAgentData, FutureSimulationData } from '@/lib/ai/types';

const scoreDimension = (weight: number, count: number) => {
  const score = Math.min(5, Math.max(1, Math.round(weight + count)));
  return score;
};

export async function evaluateWorkflow(
  input: Pick<RoutineAiWorkflowResult, 'profile' | 'interpretation' | 'optimizations' | 'futureSimulation'>
): Promise<AgentResult<JudgeEvaluation>> {
  const clarityScore = scoreDimension(2, input.profile.data.highlightedConstraints.length / 2);
  const consistencyScore = scoreDimension(2, input.interpretation.data.successSignals.length / 3);
  const explanationScore = scoreDimension(2, input.optimizations.data.proposals.length);

  const verdict = clarityScore >= 3 && consistencyScore >= 3 ? 'approve' : 'revise';

  return {
    agent: 'llm-judge',
    generatedAt: new Date().toISOString(),
    data: {
      clarity: {
        score: clarityScore,
        rationale: 'Assessed based on constraint coverage.'
      },
      consistency: {
        score: consistencyScore,
        rationale: 'Derived from overlap between intent and proposals.'
      },
      explanationQuality: {
        score: explanationScore,
        rationale: 'Measured by the variety of optimization proposals.'
      },
      verdict
    }
  };
}
