import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/shared/utils';

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
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <header className="mb-12 space-y-6 fade-in-up">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              {breadcrumb && (
                <Link
                  href={breadcrumb.href}
                  className="group inline-flex items-center text-sm text-muted-foreground transition-all duration-300 hover:text-foreground hover:translate-x-1"
                >
                  <span className="mr-1 transition-transform duration-300 group-hover:-translate-x-1">←</span>
                  {breadcrumb.label}
                </Link>
              )}
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-foreground">{title}</h1>
              {description && (
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg animate-fade-in-up">{description}</p>
              )}
            </div>
            {actions ? (
              <div className={cn('flex flex-wrap items-start gap-3 scale-in', breadcrumb && 'pt-8 md:pt-0')}>
                {actions}
              </div>
            ) : null}
          </div>
        </header>
        <section className="space-y-8">{children}</section>
      </div>
    </div>
  );
}
