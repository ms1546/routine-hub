/**
 * useSession Hook Next.js Implementation
 *
 * This is the Next.js-specific implementation using next-auth/react.
 * It is used in Next.js runtime via normal import resolution.
 *
 * Storybook will NOT import this file due to alias configuration.
 */

'use client';

import { useSession as useNextAuthSession } from 'next-auth/react';

export type UseSessionReturn = ReturnType<typeof useNextAuthSession>;

/**
 * useSession hook (Next.js implementation)
 *
 * Returns the session from next-auth/react.
 * This is only used in Next.js runtime contexts.
 */
export function useSession(): UseSessionReturn {
  return useNextAuthSession();
}
