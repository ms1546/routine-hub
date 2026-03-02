import { AppShell } from '@/shared/components/app-shell';
import { RoutineComposer } from '@/features/routines/components/routine-composer';
import { RoutineFilters } from '@/features/routines/components/routine-filters';
import { RoutineList } from '@/features/routines/components/routine-list';
import {
  createRoutineAction
} from '@/features/routines/actions/routines';
import type { RoutineFilter } from '@/features/routines';
import { routinesRepository, toRoutineListItem } from '@/features/routines';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { userSettingsRepository } from '@/features/users';

const isValidDuration = (value: string | null | undefined): value is 'normal' | 'weekly' =>
  value === 'normal' || value === 'weekly';

const isValidVisibility = (value: string | null | undefined): value is 'public' | 'private' =>
  value === 'public' || value === 'private';

const parseFilters = (searchParams?: Record<string, string | string[] | undefined>): RoutineFilter | undefined => {
  if (!searchParams) return undefined;
  const filter: RoutineFilter = {};
  const tag = typeof searchParams.tag === 'string' ? searchParams.tag.toLowerCase() : undefined;
  const duration = typeof searchParams.duration === 'string' ? searchParams.duration : undefined;
  const visibility = typeof searchParams.visibility === 'string' ? searchParams.visibility : undefined;
  const query = typeof searchParams.q === 'string' ? searchParams.q.trim() : undefined;
  const ownerDisplayName = typeof searchParams.account === 'string' ? searchParams.account.trim() : undefined;

  if (tag) filter.tag = tag;
  if (isValidDuration(duration)) filter.duration = duration;
  if (isValidVisibility(visibility)) filter.visibility = visibility;
  if (query) filter.query = query;
  if (ownerDisplayName) filter.ownerDisplayName = ownerDisplayName;

  return Object.keys(filter).length > 0 ? filter : undefined;
};

export default async function RoutinesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser.role === 'admin';
  const resolvedSearchParams = await searchParams;
  const filter = parseFilters(resolvedSearchParams);
  const [allRoutines, filteredByRepo] = await Promise.all([
    routinesRepository.list(undefined, currentUser.id, currentUser.email, isAdmin),
    routinesRepository.list(filter, currentUser.id, currentUser.email, isAdmin)
  ]);

  let filteredRoutines = filteredByRepo;
  if (filter?.ownerDisplayName && filter.ownerDisplayName.trim()) {
    const owners = Array.from(new Set(filteredByRepo.map((r) => r.owner)));
    const ownerDisplayNames = await Promise.all(
      owners.map(async (owner) => {
        const settings = await userSettingsRepository.get(owner).catch(() => null);
        return { owner, displayName: settings?.displayName ?? '' };
      })
    );
    const ownerToDisplayName = new Map(ownerDisplayNames.map((o) => [o.owner, o.displayName]));
    const q = filter.ownerDisplayName.trim().toLowerCase();
    filteredRoutines = filteredByRepo.filter((r) => {
      const displayName = (ownerToDisplayName.get(r.owner) ?? '').toLowerCase();
      return displayName.includes(q);
    });
  }

  const uniqueTags = Array.from(new Set(allRoutines.flatMap((routine) => routine.tags))).sort();
  const listItems = filteredRoutines.map(toRoutineListItem);

  const filterActive = !!filter;

  return (
    <AppShell
      title="Routines"
    >
      <RoutineFilters availableTags={uniqueTags} />
      <RoutineList routines={listItems} userEmail={currentUser.email} filterActive={filterActive} />
    </AppShell>
  );
}
