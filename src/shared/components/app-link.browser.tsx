/**
 * AppLink Browser Implementation
 *
 * This is the browser-safe implementation using native <a> tag.
 * It is used in Storybook via alias configuration.
 *
 * Next.js will NOT import this file due to normal import resolution.
 */

import type { ComponentProps, ReactNode } from 'react';

export type AppLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
} & Omit<ComponentProps<'a'>, 'href' | 'children' | 'className' | 'onClick'>;

export function AppLink({ href, children, className, onClick, ...props }: AppLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // In Storybook, prevent default navigation to avoid page reload
    if (onClick) {
      onClick();
    }
    e.preventDefault();
  };

  return (
    <a href={href} className={className} onClick={handleClick} {...(props as ComponentProps<'a'>)}>
      {children}
    </a>
  );
}
