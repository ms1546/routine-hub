'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils';

const variantClasses: Record<string, string> = {
  default: 'border-transparent bg-foreground text-background shadow-sm hover:bg-foreground/90',
  outline: 'text-foreground border-foreground bg-background'
};

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'relative inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        'transition-all duration-300',
        'hover:scale-105 hover:shadow-md',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
