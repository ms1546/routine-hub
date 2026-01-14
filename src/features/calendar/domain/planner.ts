import type { Routine } from '@/features/routines';
import { runRoutineAiWorkflow } from '@/features/ai';
import type { RoutineAiWorkflowResult } from '@/features/ai/types';
import type { CalendarEvent, ProposedCalendarEvent, CalendarTimeRange } from './types';
import { buildProposedEvents } from './proposals';
import { getCalendarClient } from './client';
import { createDefaultCalendarWindow } from './window';
import { hasStoredRefreshToken } from '@/infrastructure/auth/oauth-boundary';
import type { AuthenticatedUser } from '@/infrastructure/auth/session';
import {
  canExecuteWorkflow,
  getExecutionLimit,
  recordWorkflowFailure,
  recordWorkflowSuccess,
  registerExecutionUsage
} from '@/features/ai/execution-log';

export type RoutinePlan = {
  workflow: RoutineAiWorkflowResult | null;
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  calendarWindow: CalendarTimeRange;
  isCalendarConnected: boolean;
  aiAccess: {
    allowed: boolean;
    remaining: number | null;
    limit: number | null;
    message?: string;
  };
  executionId: string | null;
};

export async function planRoutineWithCalendar(routine: Routine, viewer: AuthenticatedUser): Promise<RoutinePlan> {
  const calendarWindow = createDefaultCalendarWindow();
  let workflow: RoutineAiWorkflowResult | null = null;
  let executionId: string | null = null;
  const limitSnapshot = getExecutionLimit(viewer);
  const allowedToExecute = canExecuteWorkflow(viewer);

  if (allowedToExecute) {
    try {
      workflow = await runRoutineAiWorkflow({
        routine,
        user: {
          timezone: 'Asia/Tokyo',
          priorities: ['集中を守る', '丁寧な合意形成'],
          constraints: ['出張が多い'],
          energyLevel: 'medium'
        },
        calendarWindow: {
          startDate: calendarWindow.start,
          endDate: calendarWindow.end
        }
      });
      registerExecutionUsage(viewer);
      const record = recordWorkflowSuccess({
        result: workflow,
        workflowName: 'routine-ai-workflow',
        routine,
        user: viewer
      });
      executionId = record.id;
    } catch (error) {
      registerExecutionUsage(viewer);
      recordWorkflowFailure({
        workflowName: 'routine-ai-workflow',
        routine,
        user: viewer,
        error: error instanceof Error ? error : new Error('Unknown workflow failure')
      });
      throw error;
    }
  }

  const proposedEvents = buildProposedEvents(routine, calendarWindow);
  const isCalendarConnected = await hasStoredRefreshToken(routine.owner);
  const client = getCalendarClient(routine.owner);
  const existingEvents = await client.listEvents(calendarWindow);
  const allowance = allowedToExecute
    ? getExecutionLimit(viewer)
    : limitSnapshot;

  const aiAccess = allowedToExecute
    ? {
        allowed: true,
        remaining: allowance.remaining,
        limit: allowance.limit
      }
    : {
        allowed: false,
        remaining: 0,
        limit: allowance.limit,
        message: 'AI preview limit reached for this account. Contact an admin for assistance.'
      };

  return {
    workflow,
    proposedEvents,
    existingEvents,
    calendarWindow,
    isCalendarConnected,
    aiAccess,
    executionId
  };
}
