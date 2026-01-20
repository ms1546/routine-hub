'use client';

import { signOut } from '@/shared/hooks/use-sign-out';
import { useSession } from '@/shared/hooks/use-session';
import { Button } from '@/shared/ui/button';
import { AppLink } from './app-link';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-10 w-20 bg-muted animate-pulse rounded-lg" />;
  }

  if (!session) {
    return (
      <AppLink href="/auth/signin">
        <Button variant="outline" size="sm">
          ログイン
        </Button>
      </AppLink>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <AppLink href="/settings">
        <Button variant="ghost" size="sm">
          {session.user?.displayName ?? session.user?.name ?? '設定'}
        </Button>
      </AppLink>
      <form
        action={async () => {
          await signOut({ redirectTo: '/' });
        }}
      >
        <Button type="submit" variant="outline" size="sm">
          ログアウト
        </Button>
      </form>
    </div>
  );
}
