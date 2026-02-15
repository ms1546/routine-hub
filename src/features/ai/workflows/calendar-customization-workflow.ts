import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { UserProfileContext } from '../types';
import { runCalendarCustomizationAgent } from '../agents/calendar-customization-agent';
import { calendarCustomizationAgentDataSchema } from '../agents/calendar-customization-agent';

const workflowInputSchema = z.object({
  proposedEvents: z.array(
    z.object({
      proposalId: z.string(),
      routineId: z.string(),
      blockId: z.string(),
      title: z.string(),
      description: z.string(),
      start: z.string(),
      end: z.string(),
      status: z.enum(['pending', 'confirmed']),
      recurrence: z.any().optional()
    })
  ),
  existingEvents: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      start: z.string(),
      end: z.string(),
      source: z.any().optional()
    })
  ),
  userProfile: z.object({
    timezone: z.string(),
    priorities: z.array(z.string()),
    constraints: z.array(z.string()),
    energyLevel: z.enum(['low', 'medium', 'high'])
  }),
  routinePurpose: z.string().optional() // Routineの目的を追加
});

const workflowOutputSchema = z.object({
  customizedEvents: z.array(
    z.object({
      proposalId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      reasoning: z.string()
    })
  ),
  suggestions: z.array(
    z.object({
      type: z.enum(['time-adjustment', 'energy-optimization', 'conflict-resolution']),
      description: z.string(),
      affectedProposalIds: z.array(z.string())
    })
  )
});

const customizationStep = createStep({
  id: 'customization-step',
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => {
    const customization = await runCalendarCustomizationAgent({
      proposedEvents: inputData.proposedEvents as ProposedCalendarEvent[],
      existingEvents: inputData.existingEvents as CalendarEvent[],
      userProfile: inputData.userProfile as UserProfileContext,
      routinePurpose: inputData.routinePurpose
    });

    return {
      customizedEvents: customization.data.customizedEvents,
      suggestions: customization.data.suggestions
    };
  }
});

export const calendarCustomizationWorkflow = createWorkflow({
  id: 'calendar-customization-workflow',
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema
})
  .then(customizationStep)
  .commit();

export const calendarCustomizationWorkflowSchemas = {
  input: workflowInputSchema,
  output: workflowOutputSchema
};
