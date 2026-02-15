/**
 * SessionProvider Next.js Implementation
 *
 * This is the Next.js-specific implementation using next-auth/react.
 * It is used in Next.js runtime via normal import resolution.
 *
 * Storybook will NOT import this file due to alias configuration.
 */

'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { DisplayNameChecker } from './display-name-checker';

export type SessionProviderProps = {
  children: ReactNode;
};

/**
 * SessionProvider component (Next.js implementation)
 *
 * Provides session context using next-auth/react.
 * This is only used in Next.js runtime contexts.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      {children}
      <DisplayNameChecker />
    </NextAuthSessionProvider>
  );
}
