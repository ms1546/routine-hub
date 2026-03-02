import { AppShell } from '@/shared/components/app-shell';
import { RoutineComposer } from '@/features/routines/components/routine-composer';
import { RoutineFilters } from '@/features/routines/components/routine-filters';
import { RoutineList } from '@/features/routines/components/routine-list';
import {
  createRoutineAction
} from '@/features/routines/actions/routines';
import type { RoutineFilter } from '@/features/routines';
import { getOwnerId, routinesRepository, toRoutineListItem } from '@/features/routines';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { userSettingsRepository } from '@/features/users';

const isValidDuration = (value: string | null | undefined): value is 'normal' | 'weekly' =>
  value === 'normal' || value === 'weekly';

const parseFilters = (searchParams?: Record<string, string | string[] | undefined>): RoutineFilter | undefined => {
  if (!searchParams) return undefined;
  const filter: RoutineFilter = {};
  const tag = typeof searchParams.tag === 'string' ? searchParams.tag.toLowerCase() : undefined;
  const duration = typeof searchParams.duration === 'string' ? searchParams.duration : undefined;
  const query = typeof searchParams.q === 'string' ? searchParams.q.trim() : undefined;
  const ownerDisplayName = typeof searchParams.account === 'string' ? searchParams.account.trim() : undefined;

  if (tag) filter.tag = tag;
  if (isValidDuration(duration)) filter.duration = duration;
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
    const ownerIds = Array.from(new Set(filteredByRepo.map((r) => getOwnerId(r))));
    const ownerDisplayNames = await Promise.all(
      ownerIds.map(async (ownerId) => {
        const settings = await userSettingsRepository.get(ownerId).catch(() => null);
        return { ownerId, displayName: settings?.displayName ?? '' };
      })
    );
    const ownerIdToDisplayName = new Map(ownerDisplayNames.map((o) => [o.ownerId, o.displayName]));
    const q = filter.ownerDisplayName.trim().toLowerCase();
    filteredRoutines = filteredByRepo.filter((r) => {
      const displayName = (ownerIdToDisplayName.get(getOwnerId(r)) ?? '').toLowerCase();
      return displayName.includes(q);
    });
  }

  const uniqueTags = Array.from(new Set(allRoutines.flatMap((routine) => routine.tags))).sort();
  const listItems = filteredRoutines.map(toRoutineListItem);

  const filterActive = !!filter;

  return (
    <AppShell
      title="All Routines"
    >
      <RoutineFilters availableTags={uniqueTags} />
      <RoutineList routines={listItems} userEmail={currentUser.email} filterActive={filterActive} />
    </AppShell>
  );
}
