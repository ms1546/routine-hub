import type { RoutineAiWorkflowInput, RoutineAiWorkflowResult } from '@/lib/ai/types';
import { runProfileAgent } from '@/lib/ai/agents/profile-agent';
import { runRoutineInterpreterAgent } from '@/lib/ai/agents/routine-interpreter-agent';
import { runCalendarConflictAgent } from '@/lib/ai/agents/calendar-conflict-agent';
import { runOptimizationAgent } from '@/lib/ai/agents/optimization-agent';
import { runFutureSimulationAgent } from '@/lib/ai/agents/future-simulation-agent';
import { evaluateWorkflow } from '@/lib/ai/evaluation/judge';
import { recordLangfuseTrace } from '@/lib/ai/evaluation/langfuse-boundary';

export async function runRoutineAiWorkflow(
  input: RoutineAiWorkflowInput
): Promise<RoutineAiWorkflowResult> {
  const profile = await runProfileAgent(input);
  const interpretation = await runRoutineInterpreterAgent(input);
  const conflicts = await runCalendarConflictAgent(input);
  const optimizations = await runOptimizationAgent({ input, profile, conflicts });
  const futureSimulation = await runFutureSimulationAgent({ input, optimizations });
  const evaluation = await evaluateWorkflow({
    profile,
    interpretation,
    optimizations,
    futureSimulation
  });
  const langfuse = await recordLangfuseTrace({
    workflow: 'routine-ai-workflow',
    payload: { profile, interpretation, evaluation }
  });

  return {
    profile,
    interpretation,
    conflicts,
    optimizations,
    futureSimulation,
    evaluation,
    meta: {
      proposalsOnly: true,
      langfuseTraceId: langfuse.traceId
    }
  };
}
