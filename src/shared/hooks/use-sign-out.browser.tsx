/**
 * signOut Function Browser Implementation
 *
 * This is the browser-safe implementation for Storybook.
 * It is used in Storybook via alias configuration.
 *
 * Next.js will NOT import this file due to normal import resolution.
 */

'use client';

/**
 * signOut function (browser implementation)
 *
 * In Storybook, logs a message instead of actually signing out.
 * This prevents next-auth/react from being imported in browser builds.
 */
export async function signOut(_options?: { redirectTo?: string }) {
  console.log('[Storybook Mock] signOut called');
  // No-op in Storybook
}
