/**
 * Auth Session Browser Implementation
 *
 * This is the browser-safe implementation for Storybook.
 * It is used in Storybook via alias configuration.
 *
 * Next.js will NOT import this file due to normal import resolution.
 */

import { getMockUserProfile } from './user-directory';

export type UserRole = 'admin' | 'member';

export type AuthenticatedUser = {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
};

/**
 * Get current user (browser implementation)
 *
 * In Storybook, always returns a mock user.
 * This prevents next-auth from being imported in browser builds.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser> {
  // In Storybook, use mock user
  // Note: process.env is available in Vite, but we use a default for safety
  const email = 'routinehub.dev@gmail.com';
  const mockProfile = getMockUserProfile(email);
  return {
    id: mockProfile.id,
    displayName: mockProfile.displayName,
    email: mockProfile.email,
    role: mockProfile.role
  };
}

export function isAdminUser(user: AuthenticatedUser): boolean {
  return user.role === 'admin';
}

export function assertAdminUser(user: AuthenticatedUser): asserts user is AuthenticatedUser & { role: 'admin' } {
  if (!isAdminUser(user)) {
    throw new Error('Admin access required');
  }
}
