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
  reorderRoutineBlocksAction,
  toggleRoutineLikeAction
} from '@/features/routines/actions/routines';
import { planRoutineWithCalendar } from '@/features/calendar/domain/planner';
import { getCurrentUser, type AuthenticatedUser } from '@/infrastructure/auth/session';
import { userSettingsRepository } from '@/features/users';

export default async function RoutineDetailPage({
  params
}: {
  params: Promise<{ routineId: string }>;
}) {
  const { routineId } = await params;
  const currentUser = await getCurrentUser();

  // デバッグログ（本番では削除可能）
  if (typeof window === 'undefined') {
    console.log(`[RoutineDetailPage] routineId=${routineId}, currentUserId=${currentUser.id}`);
  }

  const routine = await routinesRepository.get(routineId, currentUser.id);

  // デバッグログ（本番では削除可能）
  if (typeof window === 'undefined') {
    console.log(`[RoutineDetailPage] routine found=${!!routine}, id=${routine?.id}`);
  }

  if (!routine) {
    notFound();
  }

  const detail = toRoutineDetail(routine);
  const insights = await generateRoutineInsights(routine);

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
  const isLiked = routinesRepository.isLikedByUser(routine.id, currentUser.id);

  // OwnerのdisplayNameを取得（routine.ownerはemail）
  const ownerSettings = await userSettingsRepository.get(routine.owner);
  const ownerDisplayName = ownerSettings?.displayName ?? routine.owner;

  return (
    <RoutineDetail
      routine={detail}
      insights={insights}
      ownerDisplayName={ownerDisplayName}
      onToggleVisibility={updateRoutineVisibilityAction}
      onApplyRoutine={applyRoutineAction}
      onForkRoutine={forkRoutineAction}
      onUpdateBlock={canEdit ? updateRoutineBlockAction : undefined}
      onDeleteBlock={canEdit ? deleteRoutineBlockAction : undefined}
      onReorderBlocks={canEdit ? reorderRoutineBlocksAction : undefined}
      onToggleLike={toggleRoutineLikeAction}
      userId={currentUser.id}
      isLiked={isLiked}
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

async function RoutineDetailFallback({
  routine,
  insights
}: {
  routine: RoutineDetailView;
  insights: RoutineInsight[];
}) {
  const currentUser = await getCurrentUser();
  const fullRoutine = await routinesRepository.get(routine.id, currentUser.id);
  const isLiked = fullRoutine ? routinesRepository.isLikedByUser(routine.id, currentUser.id) : false;

  // OwnerのdisplayNameを取得
  const ownerSettings = await userSettingsRepository.get(routine.owner);
  const ownerDisplayName = ownerSettings?.displayName ?? routine.owner;

  return (
    <RoutineDetail
      routine={routine}
      insights={insights}
      ownerDisplayName={ownerDisplayName}
      onToggleVisibility={updateRoutineVisibilityAction}
      onApplyRoutine={applyRoutineAction}
      onForkRoutine={forkRoutineAction}
      onToggleLike={toggleRoutineLikeAction}
      userId={currentUser.id}
      isLiked={isLiked}
      workflow={null}
    />
  );
}
