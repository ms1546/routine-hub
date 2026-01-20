/**
 * UUID Generator (Public API)
 *
 * Clean Architecture: Domain layer should not depend on Node.js-specific APIs.
 * This interface allows dependency injection of UUID generation.
 *
 * This file is the public API. The actual implementation is selected
 * via module resolution (alias) at build time:
 * - Next.js: resolves to uuid.next.ts (normal import resolution)
 * - Storybook: resolves to uuid.browser.ts (via vite alias)
 *
 * This approach eliminates runtime conditionals and ensures
 * proper tree-shaking and bundling for each environment.
 */

export type { UUIDGenerator } from './uuid.next';
export { createNodeUUIDGenerator, createBrowserUUIDGenerator, createDefaultUUIDGenerator } from './uuid.next';
