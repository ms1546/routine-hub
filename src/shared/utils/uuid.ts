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
 * IMPORTANT: We use absolute path (@/shared/utils/uuid.next) instead of
 * relative path (./uuid.next) so that Vite alias can properly replace it.
 *
 * This approach eliminates runtime conditionals and ensures
 * proper tree-shaking and bundling for each environment.
 */

export type { UUIDGenerator } from '@/shared/utils/uuid.next';
export { createNodeUUIDGenerator, createBrowserUUIDGenerator, createDefaultUUIDGenerator } from '@/shared/utils/uuid.next';
