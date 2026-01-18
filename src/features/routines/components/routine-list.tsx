import type { RoutineListItem, Routine } from '@/features/routines';
import type { VisibilityTogglePayload, ToggleLikePayload } from '@/features/routines/actions/routines';
import type { ActionResult } from '@/shared/types/actionResult';
import { RoutineCard } from './routine-card';
import { routinesRepository } from '@/features/routines';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { toggleRoutineLikeAction } from '@/app/actions/routines';

type RoutineListProps = {
  routines: RoutineListItem[];
  onToggleVisibility?: (payload: VisibilityTogglePayload) => Promise<ActionResult<Routine>>; // オプショナル: /my-routinesでは提供、/routinesでは提供しない
  userEmail?: string; // 自分のRoutineかどうかの判定に使用
};

export const RoutineList = async ({ routines, onToggleVisibility, userEmail }: RoutineListProps) => {
  const currentUser = await getCurrentUser();
  const currentUserEmail = userEmail ?? currentUser.email;

  if (routines.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="text-muted-foreground">No routines match the selected filters yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {routines.map((routine) => {
        const isLiked = routinesRepository.isLikedByUser(routine.id, currentUser.id);
        const canEdit = routine.owner === currentUserEmail || currentUser.role === 'admin';
        return (
          <RoutineCard
            key={routine.id}
            routine={routine}
            onToggleVisibility={canEdit && onToggleVisibility ? onToggleVisibility : undefined}
            onToggleLike={toggleRoutineLikeAction}
            userId={currentUser.id}
            isLiked={isLiked}
            canEdit={canEdit}
          />
        );
      })}
    </div>
  );
};
