import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AppShell } from '@/shared/components/app-shell';
import { RoutineDetailWrapper } from '@/features/routines/components/routine-detail-wrapper';
import { RoutineDetail } from '@/features/routines/components/routine-detail';
import { routinesRepository, toRoutineDetail } from '@/features/routines';
import type { Routine, RoutineDetailView } from '@/features/routines';
import {
  applyRoutineAction,
  cloneRoutineAction,
  updateRoutineVisibilityAction,
  updateRoutineBlockAction,
  addRoutineBlockAction,
  deleteRoutineBlockAction,
  reorderRoutineBlocksAction,
  toggleRoutineLikeAction,
  updateRoutineInfoAction
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
  const isAdmin = currentUser.role === 'admin';

  const routine = await routinesRepository.get(routineId, currentUser.id, currentUser.email, isAdmin);

  if (!routine) {
    notFound();
  }

  const detail = toRoutineDetail(routine);

  return (
    <AppShell
      title="Routine Details"
      breadcrumb={{ label: 'Back To Routines', href: '/routines' }}
    >
      <Suspense fallback={<RoutineDetailFallback routine={detail} />}>
        <RoutineDetailContent
          routine={routine}
          detail={detail}
          currentUser={currentUser}
        />
      </Suspense>
    </AppShell>
  );
}

type RoutineDetailContentProps = {
  routine: Routine;
  detail: RoutineDetailView;
  currentUser: AuthenticatedUser;
};

async function RoutineDetailContent({ routine, detail, currentUser }: RoutineDetailContentProps) {
  const calendarPlan = await planRoutineWithCalendar(routine, currentUser);
  const canEdit = currentUser.email === routine.owner || currentUser.role === 'admin';
  const isLiked = await routinesRepository.isLikedByUser(routine.id, currentUser.id);

  // OwnerのdisplayNameを取得（routine.ownerはemail）
  const ownerSettings = await userSettingsRepository.get(routine.owner);
  const ownerDisplayName = ownerSettings?.displayName ?? routine.owner;

  return (
    <RoutineDetailWrapper
      routine={detail}
      ownerDisplayName={ownerDisplayName}
      onToggleVisibility={updateRoutineVisibilityAction}
      onApplyRoutine={applyRoutineAction}
      onCloneRoutine={cloneRoutineAction}
      onUpdateRoutineInfo={canEdit ? updateRoutineInfoAction : undefined}
      onUpdateBlock={canEdit ? updateRoutineBlockAction : undefined}
      onAddBlock={canEdit ? addRoutineBlockAction : undefined}
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
  routine
}: {
  routine: RoutineDetailView;
}) {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser.role === 'admin';
  const fullRoutine = await routinesRepository.get(routine.id, currentUser.id, currentUser.email, isAdmin);
  const isLiked = fullRoutine
    ? await routinesRepository.isLikedByUser(routine.id, currentUser.id)
    : false;

  // OwnerのdisplayNameを取得（emailは表示しない）
  const ownerSettings = await userSettingsRepository.get(routine.owner);
  const ownerDisplayName = ownerSettings?.displayName ?? 'Unknown';

  return (
    <RoutineDetail
      routine={routine}
      ownerDisplayName={ownerDisplayName}
      onToggleVisibility={updateRoutineVisibilityAction}
      onApplyRoutine={applyRoutineAction}
      onCloneRoutine={cloneRoutineAction}
      onToggleLike={toggleRoutineLikeAction}
      userId={currentUser.id}
      isLiked={isLiked}
      workflow={null}
    />
  );
}
