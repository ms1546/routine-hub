import type { Routine } from '@/features/routines';
import { runRoutineAiWorkflow } from '@/features/ai';
import type { RoutineAiWorkflowResult } from '@/features/ai/types';
import type { CalendarEvent, ProposedCalendarEvent, CalendarTimeRange } from './types';
import { buildProposedEvents } from './proposals';
import { getCalendarClient } from '@/infrastructure/calendar/calendar-client-factory';
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
  // AI Analysisはボタン押下時に実行するため、ここでは実行しない
  const workflow: RoutineAiWorkflowResult | null = null;
  const executionId: string | null = null;
  const limitSnapshot = await getExecutionLimit(viewer);
  const allowedToExecute = await canExecuteWorkflow(viewer);

  const proposedEvents = buildProposedEvents(routine, calendarWindow);
  const isCalendarConnected = await hasStoredRefreshToken(routine.owner);
  const client = getCalendarClient(routine.owner);
  const existingEvents = await client.listEvents(calendarWindow);
  const allowance = allowedToExecute
    ? await getExecutionLimit(viewer)
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
