import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { routinePlanningWorkflow } from './workflow';
import { calendarCustomizationWorkflow } from '../workflows/calendar-customization-workflow';

export const mastraRepository = new Mastra({
  workflows: {
    routinePlanningWorkflow,
    calendarCustomizationWorkflow
  },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});

export type RegisteredWorkflows = ReturnType<typeof mastraRepository.getWorkflows>;
