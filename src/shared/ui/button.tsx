'use client';

import * as React from 'react';
import { buttonVariants, type ButtonVariant, type ButtonSize } from './button-variants';
export { buttonVariants } from './button-variants';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    return <button className={buttonVariants({ variant, size, className })} ref={ref} type={type} {...props} />;
  }
);

Button.displayName = 'Button';
