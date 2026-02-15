/**
 * useSignOut Hook (Public API)
 *
 * Clean Architecture: UI components should not depend on next-auth/react directly.
 * This abstraction allows dependency injection of sign-out functionality.
 *
 * This file is the public API. The actual implementation is selected
 * via module resolution (alias) at build time:
 * - Next.js: resolves to use-sign-out.next.tsx (normal import resolution)
 * - Storybook: resolves to use-sign-out.browser.tsx (via vite alias)
 *
 * IMPORTANT: We use absolute path (@/shared/hooks/use-sign-out.next) instead of
 * relative path (./use-sign-out.next) so that Vite alias can properly replace it.
 */

export { signOut } from '@/shared/hooks/use-sign-out.next';
