'use client';

import * as React from 'react';
import { cn } from '@/shared/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  const { className, ...rest } = props;
  return (
    <textarea
      ref={ref}
      className={cn(
        'relative flex min-h-[120px] w-full rounded-lg border-2 border-input bg-background px-4 py-3 text-sm text-foreground leading-relaxed',
        'transition-all duration-300',
        'placeholder:text-muted-foreground/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/60',
        'focus-visible:shadow-lg focus-visible:shadow-ring/30',
        'hover:border-primary/50 hover:shadow-md',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30 disabled:border-border/40',
        'resize-y',
        className
      )}
      {...rest}
    />
  );
});

Textarea.displayName = 'Textarea';
