/**
 * Auth Session (Public API)
 *
 * Clean Architecture: UI/domain layers should not depend on next-auth directly.
 * This abstraction allows dependency injection of authentication.
 *
 * This file is the public API. The actual implementation is selected
 * via module resolution (alias) at build time:
 * - Next.js: resolves to session.next.ts (normal import resolution)
 * - Storybook: resolves to session.browser.ts (via vite alias)
 *
 * This approach eliminates runtime conditionals and ensures
 * proper tree-shaking and bundling for each environment.
 */

export type { UserRole, AuthenticatedUser } from './session.next';
export { getCurrentUser, isAdminUser, assertAdminUser } from './session.next';
