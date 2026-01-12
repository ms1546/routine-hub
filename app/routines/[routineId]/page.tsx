import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { RoutineDetail } from '@/components/routines/routine-detail';
import { routinesRepository, toRoutineDetail } from '@/lib/routines';
import { generateRoutineInsights } from '@/lib/ai/insights';
import {
  applyRoutineAction,
  forkRoutineAction,
  updateRoutineVisibilityAction
} from '@/app/actions/routines';
import { planRoutineWithCalendar } from '@/lib/calendar/planner';

export default async function RoutineDetailPage({
  params
}: {
  params: Promise<{ routineId: string }>;
}) {
  const { routineId } = await params;
  const routine = await routinesRepository.get(routineId);
  if (!routine) {
    notFound();
  }

  const detail = toRoutineDetail(routine);
  const insights = await generateRoutineInsights(routine);
  const calendarPlan = await planRoutineWithCalendar(routine);

  return (
    <AppShell
      title="Routine Intelligence"
      description="Inspect the cadence, guardrails, and AI commentary before applying anything to your calendar."
      breadcrumb={{ label: 'Back to library', href: '/routines' }}
    >
      <RoutineDetail
        routine={detail}
        insights={insights}
        onToggleVisibility={updateRoutineVisibilityAction}
        onApplyRoutine={applyRoutineAction}
        onForkRoutine={forkRoutineAction}
        calendarPlan={{
          proposedEvents: calendarPlan.proposedEvents,
          existingEvents: calendarPlan.existingEvents
        }}
      />
    </AppShell>
  );
}
