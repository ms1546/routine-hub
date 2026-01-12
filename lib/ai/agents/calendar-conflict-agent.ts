import type {
  RoutineAiWorkflowInput,
  AgentResult,
  ConflictAgentData
} from '@/lib/ai/types';
import { mockLlmGenerate } from '@/lib/ai/mock-llm';

export async function runCalendarConflictAgent(
  input: RoutineAiWorkflowInput
): Promise<AgentResult<ConflictAgentData>> {
  const conflicts: ConflictAgentData['conflicts'] = [];
  const earlyBlocks = input.routine.timeBlocks.filter((block) => block.startHour < 8);
  if (earlyBlocks.length) {
    conflicts.push({
      id: 'early-start',
      label: 'Early start pressure',
      severity: 'medium',
      rationale: 'Blocks begin before 08:00 which may conflict with preparation time.'
    });
  }

  if (input.user.constraints.some((c) => c.toLowerCase().includes('travel'))) {
    conflicts.push({
      id: 'travel-buffer',
      label: 'Travel buffer',
      severity: 'low',
      rationale: 'User flagged travel; add buffer days before confirming calendar writes.'
    });
  }

  const assumptionsMessage = await mockLlmGenerate(
    `Calendar window ${input.calendarWindow.startDate} -> ${input.calendarWindow.endDate}`,
    { topic: 'conflict assumptions', temperature: 0.2 }
  );

  return {
    agent: 'calendar-conflict-agent',
    generatedAt: new Date().toISOString(),
    data: {
      conflicts,
      assumptions: [assumptionsMessage]
    }
  };
}
