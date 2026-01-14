import type { RoutineListItem, Routine } from '@/features/routines';
import type { VisibilityTogglePayload } from '@/features/routines/actions/routines';
import type { ActionResult } from '@/shared/types';
import { RoutineCard } from './routine-card';

type RoutineListProps = {
  routines: RoutineListItem[];
  onToggleVisibility: (payload: VisibilityTogglePayload) => Promise<ActionResult<Routine>>;
};

export const RoutineList = ({ routines, onToggleVisibility }: RoutineListProps) => {
  if (routines.length === 0) {
    return <p className="text-center text-muted-foreground">No routines match the selected filters yet.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {routines.map((routine) => (
        <RoutineCard key={routine.id} routine={routine} onToggleVisibility={onToggleVisibility} />
      ))}
    </div>
  );
};
