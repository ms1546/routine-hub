import type {
  AgentResult,
  OptimizationAgentData,
  ProfileAgentData,
  ConflictAgentData,
  RoutineAiWorkflowInput
} from '@/lib/ai/types';
import { mockLlmGenerate } from '@/lib/ai/mock-llm';

export async function runOptimizationAgent({
  input,
  profile,
  conflicts
}: {
  input: RoutineAiWorkflowInput;
  profile: AgentResult<ProfileAgentData>;
  conflicts: AgentResult<ConflictAgentData>;
}): Promise<AgentResult<OptimizationAgentData>> {
  const proposalSummary = await mockLlmGenerate(
    `Routine ${input.routine.name} | conflicts ${conflicts.data.conflicts.length}`,
    { topic: 'optimization', temperature: 0.4 }
  );

  const baseProposal = {
    id: 'maintain-buffer',
    title: 'Add confirmation buffer',
    description:
      'Insert a manual confirmation checkpoint 24h before applying blocks to respect Google Calendar authority.',
    tradeOffs: ['Slight delay before commits', 'Higher user assurance'],
    aiOnly: false
  };

  const energyProposal = {
    id: 'energy-mapping',
    title: 'Map energy to blocks',
    description: `Align ${profile.data.persona} tone guidance with block-level energy tags.`,
    tradeOffs: ['Requires manual tagging', 'Reduces misalignment risk'],
    aiOnly: true
  };

  return {
    agent: 'optimization-agent',
    generatedAt: new Date().toISOString(),
    data: {
      proposals: [baseProposal, energyProposal]
    }
  };
}
