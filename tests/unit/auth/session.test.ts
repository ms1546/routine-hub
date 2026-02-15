import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCurrentUser, assertAdminUser, isAdminUser } from '@/infrastructure/auth/session';

describe('auth session', () => {
  const originalEnv = process.env.MOCK_USER_EMAIL;

  afterEach(() => {
    process.env.MOCK_USER_EMAIL = originalEnv;
  });

  it('resolves admin role for default account', async () => {
    process.env.MOCK_USER_EMAIL = 'routunehub.dev@gmail.com';
    const user = await getCurrentUser();
    expect(user.role).toBe('admin');
    expect(isAdminUser(user)).toBe(true);
  });

  it('throws when asserting admin for member accounts', async () => {
    process.env.MOCK_USER_EMAIL = 'owner@example.com';
    const user = await getCurrentUser();
    expect(user.role).toBe('member');
    expect(() => assertAdminUser(user)).toThrowError('Admin access required');
  });
});
