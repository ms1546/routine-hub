/**
 * SessionProvider Component (Public API)
 *
 * Clean Architecture: UI components should not depend on next-auth/react directly.
 * This abstraction allows dependency injection of session providers.
 *
 * This file is the public API. The actual implementation is selected
 * via module resolution (alias) at build time:
 * - Next.js: resolves to session-provider.next.tsx (normal import resolution)
 * - Storybook: resolves to session-provider.browser.tsx (via vite alias)
 *
 * IMPORTANT: We use absolute path (@/shared/components/session-provider.next) instead of
 * relative path (./session-provider.next) so that Vite alias can properly replace it.
 */

export type { SessionProviderProps } from '@/shared/components/session-provider.next';
export { SessionProvider } from '@/shared/components/session-provider.next';
