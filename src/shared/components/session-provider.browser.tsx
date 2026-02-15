/**
 * SessionProvider Browser Implementation
 *
 * This is the browser-safe implementation for Storybook.
 * It is used in Storybook via alias configuration.
 *
 * Next.js will NOT import this file due to normal import resolution.
 */

'use client';

import type { ReactNode } from 'react';

export type SessionProviderProps = {
  children: ReactNode;
};

/**
 * SessionProvider component (browser implementation)
 *
 * In Storybook, just renders children without session context.
 * This prevents next-auth/react from being imported in browser builds.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return <>{children}</>;
}
