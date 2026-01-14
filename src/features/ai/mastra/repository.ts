import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { routinePlanningWorkflow } from './workflow';

export const mastraRepository = new Mastra({
  workflows: {
    routinePlanningWorkflow
  },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});

export type RegisteredWorkflows = ReturnType<typeof mastraRepository.getWorkflows>;
