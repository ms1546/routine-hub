/**
 * useSession Hook (Public API)
 *
 * Clean Architecture: UI components should not depend on next-auth/react directly.
 * This abstraction allows dependency injection of session hooks.
 *
 * This file is the public API. The actual implementation is selected
 * via module resolution (alias) at build time:
 * - Next.js: resolves to use-session.next.tsx (normal import resolution)
 * - Storybook: resolves to use-session.browser.tsx (via vite alias)
 *
 * IMPORTANT: We use absolute path (@/shared/hooks/use-session.next) instead of
 * relative path (./use-session.next) so that Vite alias can properly replace it.
 *
 * This approach eliminates runtime conditionals and ensures
 * proper tree-shaking and bundling for each environment.
 */

export type { UseSessionReturn } from '@/shared/hooks/use-session.next';
export { useSession } from '@/shared/hooks/use-session.next';
