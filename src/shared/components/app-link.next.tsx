/**
 * AppLink Next.js Implementation
 *
 * This is the Next.js-specific implementation using next/link.
 * It is used in Next.js runtime via normal import resolution.
 *
 * Storybook will NOT import this file due to alias configuration.
 */

import NextLink from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export type AppLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
} & Omit<ComponentProps<'a'>, 'href' | 'children' | 'className' | 'onClick'>;

export function AppLink({ href, children, className, onClick, ...props }: AppLinkProps) {
  return (
    <NextLink href={href} className={className} onClick={onClick} {...(props as ComponentProps<typeof NextLink>)}>
      {children}
    </NextLink>
  );
}
