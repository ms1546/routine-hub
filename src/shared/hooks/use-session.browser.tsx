/**
 * useSession Hook Browser Implementation
 *
 * This is the browser-safe implementation for Storybook.
 * It is used in Storybook via alias configuration.
 *
 * Next.js will NOT import this file due to normal import resolution.
 */

'use client';

import { useState } from 'react';

export type UseSessionReturn = {
  data: {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      displayName?: string | null;
    };
  } | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  update: () => Promise<void>;
};

/**
 * useSession hook (browser implementation)
 *
 * In Storybook, returns a mock session.
 * This prevents next-auth/react from being imported in browser builds.
 */
export function useSession(): UseSessionReturn {
  const [status] = useState<'loading' | 'authenticated' | 'unauthenticated'>('authenticated');
  const [data] = useState<UseSessionReturn['data']>({
    user: {
      id: 'storybook-user',
      name: 'Storybook User',
      email: 'routunehub.dev@gmail.com',
      displayName: 'Storybook User'
    }
  });

  // Mock update function
  const update = async () => {
    // No-op in Storybook
  };

  return {
    data,
    status,
    update
  };
}
