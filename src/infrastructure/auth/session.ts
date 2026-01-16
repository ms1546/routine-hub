import { auth } from '@/auth';
import { getMockUserProfile, type MockUserProfile } from './user-directory';

export type UserRole = 'admin' | 'member';

export type AuthenticatedUser = {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
};

// NextAuthのセッションからAuthenticatedUserに変換
function sessionToAuthenticatedUser(session: { user?: { id?: string; name?: string | null; email?: string | null } } | null): AuthenticatedUser | null {
  if (!session?.user) {
    return null;
  }

  const userId = session.user.id ?? session.user.email ?? '';
  const email = session.user.email ?? '';
  const displayName = session.user.name ?? email.split('@')[0] ?? 'User';

  // 管理者判定（開発環境では特定のメールアドレスを管理者として扱う）
  const adminEmails = ['routinehub.dev@gmail.com'];
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
    const email = process.env.MOCK_USER_EMAIL ?? 'routinehub.dev@gmail.com';
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
