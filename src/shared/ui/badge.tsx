'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils';

const variantClasses: Record<string, string> = {
  default: 'border-transparent bg-secondary text-secondary-foreground',
  outline: 'text-foreground border-border bg-background',
  primary: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-muted text-muted-foreground',
  success: 'border-transparent bg-success/10 text-success border-success/20',
  warning: 'border-transparent bg-warning/10 text-warning border-warning/20',
  destructive: 'border-transparent bg-destructive/10 text-destructive border-destructive/20'
};

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        'transition-colors duration-200',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
