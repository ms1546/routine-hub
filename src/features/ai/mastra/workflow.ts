import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { routineSchema } from '@/features/routines/domain/models';
import {
  agentResultSchema,
  profileAgentDataSchema,
  interpretationAgentDataSchema,
  conflictAgentDataSchema,
  optimizationAgentDataSchema,
  futureSimulationDataSchema,
  judgeEvaluationSchema
} from '../schemas';
import { runProfileAgent } from '../agents/profile-agent';
import { runRoutineInterpreterAgent } from '../agents/routine-interpreter-agent';
import { runCalendarConflictAgent } from '../agents/calendar-conflict-agent';
import { runOptimizationAgent } from '../agents/optimization-agent';
import { runFutureSimulationAgent } from '../agents/future-simulation-agent';
import { evaluateWorkflow } from '../evaluation/judge';

const userProfileSchema = z.object({
  timezone: z.string(),
  requiredSleepHours: z.number().int().min(4).max(12).optional(),
  preferredWorkStartTime: z.string().optional(),
  preferredWorkEndTime: z.string().optional(),
  minBreakBetweenMinutes: z.number().int().min(5).max(30).optional(),
  priorities: z.array(z.string()),
  constraints: z.array(z.string()),
  energyLevel: z.enum(['low', 'medium', 'high'])
});

const calendarWindowSchema = z.object({
  startDate: z.string(),
  endDate: z.string()
});

const workflowInputSchema = z.object({
  routine: routineSchema,
  user: userProfileSchema,
  calendarWindow: calendarWindowSchema
});

const contextSchema = workflowInputSchema;

const profileResultSchema = z.object({
  context: contextSchema,
  profile: agentResultSchema(profileAgentDataSchema)
});

const interpretationResultSchema = z.object({
  context: contextSchema,
  profile: agentResultSchema(profileAgentDataSchema),
  interpretation: agentResultSchema(interpretationAgentDataSchema)
});

const conflictResultSchema = z.object({
  context: contextSchema,
  profile: agentResultSchema(profileAgentDataSchema),
  interpretation: agentResultSchema(interpretationAgentDataSchema),
  conflicts: agentResultSchema(conflictAgentDataSchema)
});

const optimizationResultSchema = z.object({
  context: contextSchema,
  profile: agentResultSchema(profileAgentDataSchema),
  interpretation: agentResultSchema(interpretationAgentDataSchema),
  conflicts: agentResultSchema(conflictAgentDataSchema),
  optimizations: agentResultSchema(optimizationAgentDataSchema)
});

const futureResultSchema = z.object({
  context: contextSchema,
  profile: agentResultSchema(profileAgentDataSchema),
  interpretation: agentResultSchema(interpretationAgentDataSchema),
  conflicts: agentResultSchema(conflictAgentDataSchema),
  optimizations: agentResultSchema(optimizationAgentDataSchema),
  futureSimulation: agentResultSchema(futureSimulationDataSchema)
});

const workflowOutputSchema = z.object({
  profile: agentResultSchema(profileAgentDataSchema),
  interpretation: agentResultSchema(interpretationAgentDataSchema),
  conflicts: agentResultSchema(conflictAgentDataSchema),
  optimizations: agentResultSchema(optimizationAgentDataSchema),
  futureSimulation: agentResultSchema(futureSimulationDataSchema),
  evaluation: agentResultSchema(judgeEvaluationSchema)
});

const profileStep = createStep({
  id: 'profile-step',
  inputSchema: workflowInputSchema,
  outputSchema: profileResultSchema,
  execute: async ({ inputData }) => {
    const profile = await runProfileAgent({ userProfile: inputData.user });
    return { context: inputData, profile };
  }
});

const interpretationStep = createStep({
  id: 'interpretation-step',
  inputSchema: profileResultSchema,
  outputSchema: interpretationResultSchema,
  execute: async ({ inputData }) => {
    const interpretation = await runRoutineInterpreterAgent({
      routine: inputData.context.routine,
      profileSummary: inputData.profile.data
    });
    return { ...inputData, interpretation };
  }
});

const conflictStep = createStep({
  id: 'conflict-step',
  inputSchema: interpretationResultSchema,
  outputSchema: conflictResultSchema,
  execute: async ({ inputData }) => {
    const conflicts = await runCalendarConflictAgent({
      routine: inputData.context.routine,
      interpretedRoutineIntent: inputData.interpretation.data,
      userProfile: inputData.context.user,
      calendarWindow: inputData.context.calendarWindow
    });
    return { ...inputData, conflicts };
  }
});

const optimizationStep = createStep({
  id: 'optimization-step',
  inputSchema: conflictResultSchema,
  outputSchema: optimizationResultSchema,
  execute: async ({ inputData }) => {
    const optimizations = await runOptimizationAgent({
      routine: inputData.context.routine,
      profile: inputData.profile,
      interpretation: inputData.interpretation,
      conflicts: inputData.conflicts
    });
    return { ...inputData, optimizations };
  }
});

const futureStep = createStep({
  id: 'future-step',
  inputSchema: optimizationResultSchema,
  outputSchema: futureResultSchema,
  execute: async ({ inputData }) => {
    const futureSimulation = await runFutureSimulationAgent({
      routineName: inputData.context.routine.name,
      optimizations: inputData.optimizations,
      profile: inputData.profile
    });
    return { ...inputData, futureSimulation };
  }
});

const judgeStep = createStep({
  id: 'judge-step',
  inputSchema: futureResultSchema,
  outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => {
    const evaluation = await evaluateWorkflow({
      optimizations: inputData.optimizations,
      conflicts: inputData.conflicts,
      futureSimulation: inputData.futureSimulation
    });

    return {
      profile: inputData.profile,
      interpretation: inputData.interpretation,
      conflicts: inputData.conflicts,
      optimizations: inputData.optimizations,
      futureSimulation: inputData.futureSimulation,
      evaluation
    };
  }
});

export const routinePlanningWorkflow = createWorkflow({
  id: 'routine-planning-workflow',
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,
})
  .then(profileStep)
  .then(interpretationStep)
  .then(conflictStep)
  .then(optimizationStep)
  .then(futureStep)
  .then(judgeStep)
  .commit();

export const routinePlanningWorkflowSchemas = {
  input: workflowInputSchema,
  output: workflowOutputSchema
};
