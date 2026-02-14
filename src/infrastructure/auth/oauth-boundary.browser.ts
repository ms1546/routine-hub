/**
 * OAuth Boundary Browser Implementation
 *
 * This is the browser-safe implementation for Storybook.
 * It is used in Storybook via alias configuration.
 *
 * Next.js will NOT import this file due to normal import resolution.
 */

export type OAuthSession = {
  provider: 'google';
  accessToken: string;
  expiresAt: string;
};

export type TokenExchangeResult = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
};

/**
 * Build Google OAuth URL (browser implementation)
 *
 * In Storybook, returns a mock URL.
 * This prevents googleapis from being imported in browser builds.
 */
export function buildGoogleOAuthUrl(_state: string): string {
  return 'https://accounts.google.com/o/oauth2/v2/auth?mock=true';
}

/**
 * Exchange code for tokens (browser implementation)
 *
 * In Storybook, returns mock tokens.
 * This prevents googleapis from being imported in browser builds.
 */
export async function exchangeCodeForTokens(_code: string): Promise<TokenExchangeResult> {
  return {
    accessToken: 'mock-access-token',
    expiresAt: new Date(Date.now() + 3600_000).toISOString()
  };
}

/**
 * Get access token for user (browser implementation)
 *
 * In Storybook, returns mock session.
 * This prevents googleapis from being imported in browser builds.
 */
export async function getAccessTokenForUser(_userId: string): Promise<OAuthSession> {
  return {
    provider: 'google',
    accessToken: 'mock-access-token',
    expiresAt: new Date(Date.now() + 3600_000).toISOString()
  };
}

/**
 * Check if user has stored refresh token (browser implementation)
 *
 * In Storybook, always returns false.
 * This prevents googleapis from being imported in browser builds.
 */
export async function hasStoredRefreshToken(_userId: string): Promise<boolean> {
  return false;
}

/**
 * Store access token for user (browser implementation)
 *
 * In Storybook, this is a no-op.
 */
export function storeAccessTokenForUser(_userId: string, _accessToken: string, _expiresAt?: string) {
  return;
}
