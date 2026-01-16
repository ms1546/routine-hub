import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/shared/utils';
import { AuthButton } from './auth-button';

type AppShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  breadcrumb?: {
    label: string;
    href: string;
  };
};

export function AppShell({ title, description, children, actions, breadcrumb }: AppShellProps) {
  return (
    <div className="min-h-screen gradient-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="mb-8 fade-in-up">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              {breadcrumb && (
                <Link
                  href={breadcrumb.href}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {breadcrumb.label}
                </Link>
              )}
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">{title}</h1>
              {description && (
                <p className="max-w-2xl text-muted-foreground">{description}</p>
              )}
            </div>
            <div className={cn('flex flex-wrap items-start gap-2', breadcrumb && 'pt-6 md:pt-0')}>
              {actions}
              <AuthButton />
            </div>
          </div>
        </header>
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
