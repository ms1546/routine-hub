import type { RoutineAiWorkflowInput, AgentResult, InterpretationAgentData } from '@/lib/ai/types';
import { mockLlmGenerate } from '@/lib/ai/mock-llm';

export async function runRoutineInterpreterAgent(
  input: RoutineAiWorkflowInput
): Promise<AgentResult<InterpretationAgentData>> {
  const tagSummary = await mockLlmGenerate(
    `Routine tags: ${input.routine.tags.join(', ')} | purpose: ${input.routine.purpose}`,
    { topic: 'interpretation', temperature: 0.3 }
  );

  return {
    agent: 'routine-interpreter-agent',
    generatedAt: new Date().toISOString(),
    data: {
      intent: tagSummary,
      successSignals: [
        'Blocks respect minimum 3h window',
        `Owner visibility: ${input.routine.visibility}`,
        `Duration: ${input.routine.durationType}`
      ],
      riskSignals: input.routine.timeBlocks.length > 4 ? ['User fatigue risk due to block count'] : []
    }
  };
}
