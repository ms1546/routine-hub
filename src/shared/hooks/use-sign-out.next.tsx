/**
 * signOut Function Next.js Implementation
 *
 * This is the Next.js-specific implementation using next-auth/react.
 * It is used in Next.js runtime via normal import resolution.
 *
 * Storybook will NOT import this file due to alias configuration.
 */

'use client';

import { signOut as nextAuthSignOut } from 'next-auth/react';

/**
 * signOut function (Next.js implementation)
 *
 * Signs out the user using next-auth/react.
 * This is only used in Next.js runtime contexts.
 */
export async function signOut(options?: { redirectTo?: string }) {
  await nextAuthSignOut({ redirectTo: options?.redirectTo });
}
