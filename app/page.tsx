import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { RoutineList } from '@/components/routines/routine-list';
import { buttonVariants } from '@/components/ui/button-variants';
import { updateRoutineVisibilityAction } from '@/app/actions/routines';
import { routinesRepository, toRoutineListItem } from '@/lib/routines';

export default async function HomePage() {
  const highlighted = (await routinesRepository.list()).slice(0, 2).map(toRoutineListItem);

  return (
    <AppShell
      title="Routine Hub"
      description="Reuse, customize, and apply purposeful routines while keeping Google Calendar and humans in control."
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
