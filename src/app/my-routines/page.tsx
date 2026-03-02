import { AppShell } from '@/shared/components/app-shell';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { routinesRepository, toRoutineListItem } from '@/features/routines';
import { MyRoutinesList } from '@/features/routines/components/my-routines-list';

export default async function MyRoutinesPage() {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser.role === 'admin';

  // 自分のRoutineのみを取得
  const myRoutines = await routinesRepository.list(undefined, currentUser.id, currentUser.email, isAdmin);
  const listItems = myRoutines.map(toRoutineListItem);

  return (
    <AppShell
      title="My Routines"
    >
      <MyRoutinesList routines={listItems} userId={currentUser.id} userEmail={currentUser.email} />
    </AppShell>
  );
}
