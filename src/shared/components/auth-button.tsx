'use client';

import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { Button } from '@/shared/ui/button';
import Link from 'next/link';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-10 w-20 bg-muted animate-pulse rounded-lg" />;
  }

  if (!session) {
    return (
      <Link href="/auth/signin">
        <Button variant="outline" size="sm">
          ログイン
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/settings">
        <Button variant="ghost" size="sm">
          {session.user?.displayName ?? session.user?.name ?? '設定'}
        </Button>
      </Link>
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
