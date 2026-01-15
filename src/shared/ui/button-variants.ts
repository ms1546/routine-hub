import { cn } from '@/shared/utils';

const baseClasses =
  'relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background active:scale-[0.96] overflow-hidden';

export const variantClasses: Record<string, string> = {
  default: 'bg-foreground text-background shadow-lg shadow-black/20 border-2 border-foreground hover:bg-foreground/90 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5',
  destructive: 'bg-foreground text-background shadow-lg shadow-black/20 border-2 border-foreground hover:bg-foreground/90 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5',
  outline: 'border-2 border-foreground bg-background hover:bg-foreground hover:text-background hover:shadow-lg hover:-translate-y-0.5',
  secondary: 'bg-secondary text-secondary-foreground border-2 border-secondary hover:bg-secondary/90 hover:shadow-lg hover:-translate-y-0.5',
  ghost: 'hover:bg-muted hover:text-foreground hover:shadow-md border-2 border-transparent',
  link: 'text-foreground underline-offset-4 hover:underline'
};

export const sizeClasses: Record<string, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10'
};

export type ButtonVariant = keyof typeof variantClasses;
export type ButtonSize = keyof typeof sizeClasses;

export const buttonVariants = ({
  variant = 'default',
  size = 'default',
  className
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) => cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
