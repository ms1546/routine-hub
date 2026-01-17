import { AppShell } from '@/shared/components/app-shell';
import { RoutineComposer } from '@/features/routines/components/routine-composer';
import { RoutineFilters } from '@/features/routines/components/routine-filters';
import { RoutineList } from '@/features/routines/components/routine-list';
import {
  createRoutineAction,
  updateRoutineVisibilityAction
} from '@/features/routines/actions/routines';
import type { RoutineFilter } from '@/features/routines';
import { routinesRepository, toRoutineListItem } from '@/features/routines';
import { getCurrentUser } from '@/infrastructure/auth/session';

const isValidDuration = (value: string | null | undefined): value is 'half-day' | 'full-day' | 'weekly' =>
  value === 'half-day' || value === 'full-day' || value === 'weekly';

const isValidVisibility = (value: string | null | undefined): value is 'public' | 'private' =>
  value === 'public' || value === 'private';

const parseFilters = (searchParams?: Record<string, string | string[] | undefined>): RoutineFilter | undefined => {
  if (!searchParams) return undefined;
  const filter: RoutineFilter = {};
  const tag = typeof searchParams.tag === 'string' ? searchParams.tag.toLowerCase() : undefined;
  const duration = typeof searchParams.duration === 'string' ? searchParams.duration : undefined;
  const visibility = typeof searchParams.visibility === 'string' ? searchParams.visibility : undefined;

  if (tag) filter.tag = tag;
  if (isValidDuration(duration)) filter.duration = duration;
  if (isValidVisibility(visibility)) filter.visibility = visibility;

  return Object.keys(filter).length > 0 ? filter : undefined;
};

export default async function RoutinesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const [allRoutines, filteredRoutines] = await Promise.all([
    routinesRepository.list(undefined, currentUser.id),
    routinesRepository.list(parseFilters(resolvedSearchParams), currentUser.id)
  ]);
  const uniqueTags = Array.from(new Set(allRoutines.flatMap((routine) => routine.tags))).sort();
  const listItems = filteredRoutines.map(toRoutineListItem);

  return (
    <AppShell
      title="Routine Library"
      description="Browse reusable, human-reviewed routines. Duplicate, adapt, and apply them with deliberate control."
    >
      <RoutineFilters availableTags={uniqueTags} />
      <RoutineList routines={listItems} onToggleVisibility={updateRoutineVisibilityAction} userEmail={currentUser.email} />
    </AppShell>
  );
}
