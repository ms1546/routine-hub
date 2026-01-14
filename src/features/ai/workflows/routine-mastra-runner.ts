import { randomUUID } from 'node:crypto';
import type {
  RoutineAiWorkflowInput,
  RoutineAiWorkflowOptions,
  RoutineAiWorkflowResult,
  RoutineAiWorkflowRunner
} from '../types';
import { recordLangfuseTrace } from '../evaluation/langfuse-boundary';
import { mastraRepository } from '../mastra/repository';

export class MastraRoutineAiWorkflowRunner implements RoutineAiWorkflowRunner {
  async run(input: RoutineAiWorkflowInput, options?: RoutineAiWorkflowOptions): Promise<RoutineAiWorkflowResult> {
    const traceId = options?.traceId ?? randomUUID();
    const workflow = mastraRepository.getWorkflows().routinePlanningWorkflow;
    if (!workflow) {
      throw new Error('Routine workflow is not registered in Mastra repository');
    }

    const run = await workflow.createRunAsync();
    const runResult = await run.start({
      inputData: input,
      tracingOptions: { traceId }
    });

    if (runResult.status !== 'success' || !runResult.result) {
      throw new Error('Mastra workflow execution failed');
    }

    const langfuse = await recordLangfuseTrace({
      workflow: 'routine-planning-workflow',
      payload: {
        executionId: traceId
      },
      traceId
    });

    return {
      ...runResult.result,
      meta: {
        executionId: traceId,
        mastraTraceId: traceId,
        proposalsOnly: true,
        langfuseTraceId: langfuse.traceId
      }
    };
  }
}
