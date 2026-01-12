import type { RoutineAiWorkflowInput, AgentResult, ProfileAgentData } from '@/lib/ai/types';
import { mockLlmGenerate } from '@/lib/ai/mock-llm';

export async function runProfileAgent(
  input: RoutineAiWorkflowInput
): Promise<AgentResult<ProfileAgentData>> {
  const persona = await mockLlmGenerate(
    `User priorities: ${input.user.priorities.join(', ')} | constraints: ${input.user.constraints.join(', ')}`,
    { topic: 'profile', temperature: 0.1 }
  );

  return {
    agent: 'profile-agent',
    generatedAt: new Date().toISOString(),
    data: {
      persona,
      highlightedConstraints: input.user.constraints,
      toneGuidance:
        input.user.energyLevel === 'high'
          ? 'Offer ambitious ideas but require confirmation.'
          : 'Keep cadence calm and emphasize user control.'
    }
  };
}
