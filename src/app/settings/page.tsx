import { notFound } from 'next/navigation';
import { AppShell } from '@/shared/components/app-shell';
import { UserSettingsForm } from '@/features/users/components/user-settings-form';
import { getUserSettingsAction, updateUserSettingsAction } from '@/app/actions/user-settings';
import { getCurrentUser } from '@/infrastructure/auth/session';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const settingsResult = await getUserSettingsAction();

  if (!settingsResult.ok || !settingsResult.data) {
    notFound();
  }

  return (
    <AppShell
      title="User Settings"
      breadcrumb={{ label: 'Home', href: '/' }}
    >
      <UserSettingsForm
        userId={user.id}
        initialSettings={settingsResult.data}
        action={updateUserSettingsAction}
      />
    </AppShell>
  );
}
