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

  // アカウント候補: owner（アカウント名）と displayName を収集
  const ownerIds = Array.from(new Set(allRoutines.map((r) => getOwnerId(r))));
  const ownerInfoList = await Promise.all(
    ownerIds.map(async (ownerId) => {
      const settings = await userSettingsRepository.get(ownerId).catch(() => null);
      const routine = allRoutines.find((r) => getOwnerId(r) === ownerId);
      const owner = routine?.owner ?? ownerId;
      const displayName = settings?.displayName ?? '';
      const label = displayName || (owner.includes('@') ? owner.split('@')[0] : owner);
      return { ownerId, owner, label };
    })
  );
  const uniqueAccounts = Array.from(
    new Map(ownerInfoList.map((o) => [(o.label ?? '').toLowerCase(), o.label ?? ''])).entries()
  )
    .map(([, label]) => label)
    .filter((l): l is string => !!l)
    .sort();

  let filteredRoutines = filteredByRepo;
  if (filter?.ownerDisplayName && filter.ownerDisplayName.trim()) {
    const ownerIdToLabel = new Map(ownerInfoList.map((o) => [o.ownerId, o.label]));
    const q = filter.ownerDisplayName.trim().toLowerCase();
    filteredRoutines = filteredByRepo.filter((r) => {
      const label = (ownerIdToLabel.get(getOwnerId(r)) ?? r.owner ?? '').toLowerCase();
      const ownerLower = (r.owner ?? '').toLowerCase();
      return label.includes(q) || ownerLower.includes(q);
    });
  }

  const uniqueTags = Array.from(new Set(allRoutines.flatMap((routine) => routine.tags))).sort();
  const listItems = filteredRoutines.map(toRoutineListItem);

  const filterActive = !!filter;

  return (
    <AppShell
      title="All Routines"
    >
      <RoutineFilters availableTags={uniqueTags} availableAccounts={uniqueAccounts} />
      <RoutineList routines={listItems} userEmail={currentUser.email} filterActive={filterActive} />
    </AppShell>
  );
}
