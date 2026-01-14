import type {
  RoutineAiWorkflowInput,
  RoutineAiWorkflowOptions,
  RoutineAiWorkflowResult,
  RoutineAiWorkflowRunner
} from '../types';
import { MockRoutineAiWorkflowRunner } from './routine-mock-runner';

const shouldUseMastra = () => process.env.MASTRA_USE_MOCK !== 'true';

let overrideRunner: RoutineAiWorkflowRunner | null = null;
let cachedMastraRunnerPromise: Promise<RoutineAiWorkflowRunner> | null = null;
const mockRunner = new MockRoutineAiWorkflowRunner();

async function loadMastraRunner(): Promise<RoutineAiWorkflowRunner> {
  if (!cachedMastraRunnerPromise) {
    cachedMastraRunnerPromise = import('./routine-mastra-runner')
      .then((module) => new module.MastraRoutineAiWorkflowRunner());
  }
  return cachedMastraRunnerPromise;
}

export function setRoutineAiWorkflowRunner(runner: RoutineAiWorkflowRunner) {
  overrideRunner = runner;
}

export function getRoutineAiWorkflowRunner(): RoutineAiWorkflowRunner {
  return overrideRunner ?? mockRunner;
}

export async function runRoutineAiWorkflow(
  input: RoutineAiWorkflowInput,
  options?: RoutineAiWorkflowOptions
): Promise<RoutineAiWorkflowResult> {
  const runnerOverride = overrideRunner;
  if (runnerOverride) {
    return runnerOverride.run(input, options);
  }

  if (shouldUseMastra()) {
    try {
      const mastraRunner = await loadMastraRunner();
      return await mastraRunner.run(input, options);
    } catch (error) {
      console.warn('[RoutineHub] Mastra workflow not available, falling back to mock runner.', error);
    }
  }

  return mockRunner.run(input, options);
}
