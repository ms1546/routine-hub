import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AppShell } from '@/shared/components/app-shell';
import { RoutineDetail } from '@/features/routines/components/routines/routine-detail';
import { routinesRepository, toRoutineDetail } from '@/features/routines';
import type { Routine, RoutineDetailView } from '@/features/routines';
import { generateRoutineInsights, type RoutineInsight } from '@/features/ai/insights';
import {
  applyRoutineAction,
  forkRoutineAction,
  updateRoutineVisibilityAction,
  updateRoutineBlockAction,
  deleteRoutineBlockAction,
  reorderRoutineBlocksAction
} from '@/features/routines/actions/routines';
import { planRoutineWithCalendar } from '@/features/calendar/domain/planner';
import { getCurrentUser, type AuthenticatedUser } from '@/infrastructure/auth/session';

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
  const currentUser = getCurrentUser();

  return (
    <AppShell
      title="Routine Intelligence"
      description="Inspect the cadence, guardrails, and AI commentary before applying anything to your calendar."
      breadcrumb={{ label: 'Back to library', href: '/routines' }}
    >
      <Suspense fallback={<RoutineDetailFallback routine={detail} insights={insights} />}>
        <RoutineDetailContent
          routine={routine}
          detail={detail}
          insights={insights}
          currentUser={currentUser}
        />
      </Suspense>
    </AppShell>
  );
}

type RoutineDetailContentProps = {
  routine: Routine;
  detail: RoutineDetailView;
  insights: RoutineInsight[];
  currentUser: AuthenticatedUser;
};

async function RoutineDetailContent({ routine, detail, insights, currentUser }: RoutineDetailContentProps) {
  const calendarPlan = await planRoutineWithCalendar(routine, currentUser);
  const canEdit = currentUser.email === routine.owner || currentUser.role === 'admin';

  return (
    <RoutineDetail
      routine={detail}
      insights={insights}
      onToggleVisibility={updateRoutineVisibilityAction}
      onApplyRoutine={applyRoutineAction}
      onForkRoutine={forkRoutineAction}
      onUpdateBlock={canEdit ? updateRoutineBlockAction : undefined}
      onDeleteBlock={canEdit ? deleteRoutineBlockAction : undefined}
      onReorderBlocks={canEdit ? reorderRoutineBlocksAction : undefined}
      canEdit={canEdit}
      calendarPlan={{
        proposedEvents: calendarPlan.proposedEvents,
        existingEvents: calendarPlan.existingEvents,
        isCalendarConnected: calendarPlan.isCalendarConnected,
        aiAccess: calendarPlan.aiAccess
      }}
      workflow={calendarPlan.workflow}
    />
  );
}

function RoutineDetailFallback({
  routine,
  insights
}: {
  routine: RoutineDetailView;
  insights: RoutineInsight[];
}) {
  return (
    <RoutineDetail
      routine={routine}
      insights={insights}
      onToggleVisibility={updateRoutineVisibilityAction}
      onApplyRoutine={applyRoutineAction}
      onForkRoutine={forkRoutineAction}
      workflow={null}
    />
  );
}
