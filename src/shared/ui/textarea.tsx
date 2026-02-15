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
        'flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground leading-relaxed',
        'transition-colors duration-200',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary',
        'hover:border-muted-foreground/50',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
        'resize-y',
        className
      )}
      {...rest}
    />
  );
});

Textarea.displayName = 'Textarea';
