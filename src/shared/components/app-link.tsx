/**
 * AppLink Component (Public API)
 *
 * Clean Architecture: UI components depend on this abstraction,
 * not on Next.js-specific implementations.
 *
 * This file is the public API. The actual implementation is selected
 * via module resolution (alias) at build time:
 * - Next.js: resolves to app-link.next.tsx (normal import resolution)
 * - Storybook: resolves to app-link.browser.tsx (via vite alias)
 *
 * IMPORTANT: We use absolute path (@/shared/components/app-link.next) instead of
 * relative path (./app-link.next) so that Vite alias can properly replace it.
 *
 * This approach eliminates runtime conditionals and ensures
 * proper tree-shaking and bundling for each environment.
 */

export type { AppLinkProps } from '@/shared/components/app-link.next';
export { AppLink } from '@/shared/components/app-link.next';
