import type { RoutineListItem, Routine } from '@/features/routines';
import type { VisibilityTogglePayload } from '@/features/routines/actions/routines';
import type { ActionResult } from '@/shared/types/actionResult';
import { RoutineCard } from './routine-card';

type RoutineListProps = {
  routines: RoutineListItem[];
  onToggleVisibility: (payload: VisibilityTogglePayload) => Promise<ActionResult<Routine>>;
};

export const RoutineList = ({ routines, onToggleVisibility }: RoutineListProps) => {
  if (routines.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No routines match the selected filters yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {routines.map((routine, index) => (
        <div
          key={routine.id}
          className="fade-in-up"
          style={{
            animationDelay: `${index * 0.1}s`,
            animationFillMode: 'both'
          }}
        >
          <RoutineCard routine={routine} onToggleVisibility={onToggleVisibility} />
        </div>
      ))}
    </div>
  );
};
