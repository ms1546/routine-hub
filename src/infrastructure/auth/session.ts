import { getMockUserProfile, type MockUserProfile } from './user-directory';

export type UserRole = MockUserProfile['role'];

export type AuthenticatedUser = MockUserProfile;

export function getCurrentUser(): AuthenticatedUser {
  const email = process.env.MOCK_USER_EMAIL ?? 'routinehub.dev@gmail.com';
  return getMockUserProfile(email);
}

export function isAdminUser(user: AuthenticatedUser): boolean {
  return user.role === 'admin';
}

export function assertAdminUser(user: AuthenticatedUser): asserts user is AuthenticatedUser & { role: 'admin' } {
  if (!isAdminUser(user)) {
    throw new Error('Admin access required');
  }
}
