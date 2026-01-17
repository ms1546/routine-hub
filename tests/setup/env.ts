import { vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

// NextAuthのモック（統合テストで使用）
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: {
      GET: vi.fn(),
      POST: vi.fn()
    },
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(() => Promise.resolve(null))
  }))
}));
