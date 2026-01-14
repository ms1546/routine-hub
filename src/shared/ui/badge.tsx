'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils';

const variantClasses: Record<string, string> = {
  default: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'text-foreground'
};

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
