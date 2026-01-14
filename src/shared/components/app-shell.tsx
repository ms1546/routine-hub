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
    <div className="space-y-10 px-6 py-12 md:px-12 lg:px-20">
      <header className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-card/30 p-8 shadow-lg shadow-black/30 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          {breadcrumb && (
            <Link
              href={breadcrumb.href}
              className="text-xs uppercase tracking-[0.3em] text-muted-foreground"
            >
              {breadcrumb.label}
            </Link>
          )}
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h1>
          <p className="max-w-2xl text-base text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className={cn('flex flex-wrap gap-3')}>{actions}</div> : null}
      </header>
      <section className="space-y-8">{children}</section>
    </div>
  );
}
