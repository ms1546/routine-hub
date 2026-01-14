import Link from 'next/link';
import { AppShell } from '@/shared/components/app-shell';
import { RoutineList } from '@/features/routines/components/routines/routine-list';
import { buttonVariants } from '@/shared/ui/button-variants';
import { updateRoutineVisibilityAction } from '@/features/routines/actions/routines';
import { routinesRepository, toRoutineListItem } from '@/features/routines';

export default async function HomePage() {
  const highlighted = (await routinesRepository.list()).slice(0, 2).map(toRoutineListItem);

  return (
    <AppShell
      title="Routine Hub"
      actions={
        <Link href="/routines" className={buttonVariants()}>
          Explore Library
        </Link>
      }
    >
      <RoutineList routines={highlighted} onToggleVisibility={updateRoutineVisibilityAction} />
    </AppShell>
  );
}
