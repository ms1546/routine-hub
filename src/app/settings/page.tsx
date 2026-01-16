import { notFound } from 'next/navigation';
import { AppShell } from '@/shared/components/app-shell';
import { UserSettingsForm } from '@/features/users/components/user-settings-form';
import { getUserSettingsAction, updateUserSettingsAction } from '@/app/actions/user-settings';
import { getCurrentUser } from '@/infrastructure/auth/session';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const settingsResult = await getUserSettingsAction();

  if (!settingsResult.ok) {
    notFound();
  }

  return (
    <AppShell
      title="設定"
      description="アカウント情報とAI最適化の基本設定を管理します"
      breadcrumb={{ label: 'ホーム', href: '/' }}
    >
      <UserSettingsForm
        userId={user.id}
        initialSettings={settingsResult.data}
        action={updateUserSettingsAction}
      />
    </AppShell>
  );
}
