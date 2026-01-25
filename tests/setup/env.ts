import { vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth', () => ({
  auth: vi.fn(() => Promise.resolve(null)),
  signIn: vi.fn(),
  signOut: vi.fn(),
  default: vi.fn(() => ({
    handlers: {
      GET: vi.fn(),
      POST: vi.fn(),
    },
    auth: vi.fn(() => Promise.resolve(null)),
  })),
}));
vi.mock('@/features/ai/evaluation/langfuse-boundary', async () => {
  return {
    getLangfusePrompt: vi.fn(async () => ({
      prompt: 'MOCK_PROMPT',
      version: 'mock',
      labels: [],
    })),

    getLangfusePromptOrFallback: vi.fn(async () => ({
      prompt: 'MOCK_PROMPT',
      version: 'mock',
      labels: [],
    })),

    recordLangfuseTrace: vi.fn(async () => {
      return {
        traceId: 'mock-trace-id',
        span: vi.fn(() => ({
          end: vi.fn(),
        })),
        end: vi.fn(),
      };
    }),

    recordLangfuseSpan: vi.fn(async () => ({
      end: vi.fn(),
    })),
  };
});

process.env.MASTRA_USE_MOCK = 'true';
process.env.LANGFUSE_PUBLIC_KEY = 'test';
process.env.LANGFUSE_SECRET_KEY = 'test';
process.env.LANGFUSE_BASEURL = 'http://localhost';
