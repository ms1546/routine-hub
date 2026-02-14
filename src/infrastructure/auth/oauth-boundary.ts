/**
 * OAuth Boundary (Public API)
 *
 * Clean Architecture: Domain layer should not depend on googleapis directly.
 * This abstraction allows dependency injection of OAuth functionality.
 *
 * This file is the public API. The actual implementation is selected
 * via module resolution (alias) at build time:
 * - Next.js: resolves to oauth-boundary.next.ts (normal import resolution)
 * - Storybook: resolves to oauth-boundary.browser.ts (via vite alias)
 *
 * IMPORTANT: We use absolute path (@/infrastructure/auth/oauth-boundary.next) instead of
 * relative path (./oauth-boundary.next) so that Vite alias can properly replace it.
 *
 * This approach eliminates runtime conditionals and ensures
 * proper tree-shaking and bundling for each environment.
 */

export type { OAuthSession, TokenExchangeResult } from '@/infrastructure/auth/oauth-boundary.next';
export {
  buildGoogleOAuthUrl,
  exchangeCodeForTokens,
  getAccessTokenForUser,
  hasStoredRefreshToken,
  storeAccessTokenForUser
} from '@/infrastructure/auth/oauth-boundary.next';
