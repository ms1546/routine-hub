import { AppShell } from '@/shared/components/app-shell';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { routinesRepository, toRoutineListItem } from '@/features/routines';
import { MyRoutinesList } from '@/features/routines/components/my-routines-list';

export default async function MyRoutinesPage() {
  const currentUser = await getCurrentUser();

  // 自分のRoutineのみを取得
  const myRoutines = await routinesRepository.list(undefined, currentUser.id, currentUser.email);
  const listItems = myRoutines.map(toRoutineListItem);

  return (
    <AppShell
      title="My Routines"
      description="自分のRoutineを管理し、設定を変更できます"
    >
      <MyRoutinesList routines={listItems} userId={currentUser.id} userEmail={currentUser.email} />
    </AppShell>
  );
}
