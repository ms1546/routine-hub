/**
 * Auth Session Next.js Implementation
 *
 * This is the Next.js-specific implementation using next-auth.
 * It is used in Next.js runtime via normal import resolution.
 *
 * Storybook will NOT import this file due to alias configuration.
 */

import { auth } from './next-auth-config';
import { getMockUserProfile } from './user-directory';

export type UserRole = 'admin' | 'member';

export type AuthenticatedUser = {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
};

// NextAuthのセッションからAuthenticatedUserに変換
function sessionToAuthenticatedUser(session: { user?: { id?: string; name?: string | null; email?: string | null; displayName?: string | null } } | null): AuthenticatedUser | null {
  if (!session?.user) {
    return null;
  }

  const userId = session.user.id ?? session.user.email ?? '';
  const email = session.user.email ?? '';
  // セッションにdisplayNameが含まれている場合はそれを使用、なければname、最後にemailの@の前の部分
  const displayName = session.user.displayName ?? session.user.name ?? email.split('@')[0] ?? 'User';

  // 管理者判定（開発環境では特定のメールアドレスを管理者として扱う）
  const adminEmails = ['routunehub.dev@gmail.com'];
  const role: UserRole = adminEmails.includes(email) ? 'admin' : 'member';

  return {
    id: userId,
    displayName,
    email,
    role
  };
}

export async function getCurrentUser(): Promise<AuthenticatedUser> {
  const session = await auth();
  const user = sessionToAuthenticatedUser(session);

  // セッションがない場合はモックユーザーを返す（開発環境）
  if (!user) {
    const email = process.env.MOCK_USER_EMAIL ?? 'routunehub.dev@gmail.com';
    const mockProfile = getMockUserProfile(email);
    return {
      id: mockProfile.id,
      displayName: mockProfile.displayName,
      email: mockProfile.email,
      role: mockProfile.role
    };
  }

  return user;
}

export function isAdminUser(user: AuthenticatedUser): boolean {
  return user.role === 'admin';
}

export function assertAdminUser(user: AuthenticatedUser): asserts user is AuthenticatedUser & { role: 'admin' } {
  if (!isAdminUser(user)) {
    throw new Error('Admin access required');
  }
}
