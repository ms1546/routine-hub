import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';
import type {
  RoutineAiWorkflowInput,
  RoutineAiWorkflowOptions,
  RoutineAiWorkflowResult,
  RoutineAiWorkflowRunner
} from '../types';
import { runProfileAgent } from '../agents/profile-agent';
import { runRoutineInterpreterAgent } from '../agents/routine-interpreter-agent';
import { runCalendarConflictAgent } from '../agents/calendar-conflict-agent';
import { runOptimizationAgent } from '../agents/optimization-agent';
import { runFutureSimulationAgent } from '../agents/future-simulation-agent';
import { evaluateWorkflow } from '../evaluation/judge';
import { recordLangfuseTrace } from '../evaluation/langfuse-boundary';
import { isBedrockEnabled } from '../providers/bedrock';

const generateUUID = createDefaultUUIDGenerator();

export class MockRoutineAiWorkflowRunner implements RoutineAiWorkflowRunner {
  async run(input: RoutineAiWorkflowInput, options?: RoutineAiWorkflowOptions): Promise<RoutineAiWorkflowResult> {
    const profile = await runProfileAgent({ userProfile: input.user });
    const interpretation = await runRoutineInterpreterAgent({
      routine: input.routine,
      profileSummary: profile.data
    });
    const conflicts = await runCalendarConflictAgent({
      routine: input.routine,
      interpretedRoutineIntent: interpretation.data,
      userProfile: input.user,
      calendarWindow: input.calendarWindow
    });
    const optimizations = await runOptimizationAgent({
      routine: input.routine,
      profile,
      interpretation,
      conflicts
    });
    const futureSimulation = await runFutureSimulationAgent({
      routineName: input.routine.name,
      optimizations,
      profile
    });
    const evaluation = await evaluateWorkflow({
      optimizations,
      conflicts,
      futureSimulation
    });

    const executionId = options?.traceId ?? generateUUID();
    const langfuse = await recordLangfuseTrace({
      workflow: 'routine-planning-workflow',
      payload: { routineId: input.routine.id, executionId, bedrockEnabled: isBedrockEnabled() },
      traceId: executionId
    });

    return {
      profile,
      interpretation,
      conflicts,
      optimizations,
      futureSimulation,
      evaluation,
      meta: {
        executionId,
        mastraTraceId: executionId,
        proposalsOnly: true,
        langfuseTraceId: langfuse.traceId
      }
    };
  }
}
