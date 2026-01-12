import type { Routine } from '@/lib/routines';
import { runRoutineAiWorkflow } from '@/lib/ai';
import type { RoutineAiWorkflowResult } from '@/lib/ai/types';
import type { CalendarEvent, ProposedCalendarEvent, CalendarTimeRange } from './types';
import { buildProposedEvents } from './proposals';
import { getCalendarClient } from './client';
import { createDefaultCalendarWindow } from './window';

export type RoutinePlan = {
  workflow: RoutineAiWorkflowResult;
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  calendarWindow: CalendarTimeRange;
};

export async function planRoutineWithCalendar(routine: Routine): Promise<RoutinePlan> {
  const calendarWindow = createDefaultCalendarWindow();
  const workflow = await runRoutineAiWorkflow({
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

  const proposedEvents = buildProposedEvents(routine, calendarWindow);
  const client = getCalendarClient();
  const existingEvents = await client.listEvents(calendarWindow);

  return {
    workflow,
    proposedEvents,
    existingEvents,
    calendarWindow
  };
}
