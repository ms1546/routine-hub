import type {
  AgentResult,
  FutureSimulationData,
  OptimizationAgentData,
  RoutineAiWorkflowInput
} from '@/lib/ai/types';
import { mockLlmGenerate } from '@/lib/ai/mock-llm';

export async function runFutureSimulationAgent({
  input,
  optimizations
}: {
  input: RoutineAiWorkflowInput;
  optimizations: AgentResult<OptimizationAgentData>;
}): Promise<AgentResult<FutureSimulationData>> {
  const outlook = await mockLlmGenerate(
    `Future impact for ${input.routine.name} with ${optimizations.data.proposals.length} proposals`,
    { topic: 'future-simulation', temperature: 0.5 }
  );

  return {
    agent: 'future-simulation-agent',
    generatedAt: new Date().toISOString(),
    data: {
      outlook,
      guardrails: [
        'AI suggestions require user review',
        'Conflicts flagged earlier must be acknowledged before applying changes'
      ],
      followUpQuestions: ['What manual constraints changed since last apply?', 'Any new calendar sources?']
    }
  };
}
