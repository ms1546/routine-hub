'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AppLink } from '@/shared/components/app-link';
import { useSession } from '@/shared/hooks/use-session';
import { Button } from '@/shared/ui/button';
import { signOut } from '@/shared/hooks/use-sign-out';
import { cn } from '@/shared/utils';

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // メニューが開いている時にESCキーで閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // メニューが開いている時に背景スクロールを無効化
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  // Admin check: In portfolio mode, admin is determined by email address
  // This matches the logic in sessionToAuthenticatedUser() in infrastructure/auth/session.ts
  const isAdmin = session?.user?.email === 'routunehub.dev@gmail.com';

  const menuItems = [
    { href: '/', label: 'Home' },
    { href: '/routines', label: 'All Routines' },
    ...(session ? [{ href: '/my-routines', label: 'My Routines' }] : []),
    ...(session ? [{ href: '/settings', label: 'Settings' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : [])
  ];

  return (
    <>
      {/* ハンバーガーボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-background border-2 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-md"
        aria-label="メニューを開く"
        aria-expanded={isOpen}
      >
        <svg
          className="w-6 h-6 text-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* サイドナビゲーション */}
      <nav
        className={cn(
          'fixed top-0 left-0 h-full w-80 bg-background border-r-2 border-border shadow-2xl z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="メインナビゲーション"
      >
        <div className="flex flex-col h-full pt-16 px-6 pb-6">
          {/* ログイン状態表示 */}
          {status === 'loading' ? (
            <div className="mb-6 p-3 bg-muted animate-pulse rounded-lg" />
          ) : session ? (
            <div className="mb-6 p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-1">ログイン中</p>
              <p className="font-medium text-foreground">
                {session.user?.displayName ?? session.user?.name ?? session.user?.email ?? 'ユーザー'}
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <AppLink
                href="/auth/signin"
                onClick={handleLinkClick}
                className="block w-full"
              >
                <Button variant="outline" className="w-full">
                  ログイン
                </Button>
              </AppLink>
            </div>
          )}

          {/* ナビゲーション項目 */}
          <ul className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
              return (
                <li key={item.href}>
                  <AppLink
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      'block px-4 py-3 rounded-lg transition-all duration-300',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium border-2 border-primary/30'
                        : 'text-foreground hover:bg-muted/50 hover:border-2 hover:border-border'
                    )}
                  >
                    {item.label}
                  </AppLink>
                </li>
              );
            })}
          </ul>

          {/* ログアウトボタン（ログイン時のみ） */}
          {session && (
            <div className="mt-auto pt-6 border-t border-border">
              <form
                action={async () => {
                  await signOut({ redirectTo: '/' });
                }}
              >
                <Button type="submit" variant="outline" className="w-full">
                  ログアウト
                </Button>
              </form>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
