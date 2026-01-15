'use client';

import * as React from 'react';
import { cn } from '@/shared/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'relative flex h-11 w-full rounded-lg border-2 border-input bg-background px-4 py-2.5 text-sm text-foreground',
        'transition-all duration-300',
        'placeholder:text-muted-foreground/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/60',
        'focus-visible:shadow-lg focus-visible:shadow-ring/30',
        'hover:border-primary/50 hover:shadow-md',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30 disabled:border-border/40',
        'before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:opacity-0',
        'focus-visible:before:opacity-100 before:transition-opacity before:duration-300',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';
