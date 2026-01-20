'use server';

import { buildGoogleOAuthUrl, exchangeCodeForTokens } from '@/infrastructure/auth/oauth-boundary';

/**
 * Get Google OAuth URL for calendar access
 *
 * PORTFOLIO MODE: Uses prompt=consent to ensure explicit user intent.
 * Access tokens are short-lived; refresh tokens are NOT stored.
 */
export function getGoogleOAuthUrlAction(userId: string) {
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
  return buildGoogleOAuthUrl(state);
}

/**
 * Complete Google OAuth flow and return access token
 *
 * PORTFOLIO MODE: Refresh tokens are NOT stored.
 * This is an intentional design decision for portfolio context:
 * - Reduces credential exposure risk
 * - Lowers operational overhead
 * - Simplifies security model
 * - Avoids requiring sensitive infrastructure (AWS Secrets Manager)
 *
 * Each calendar write requires new OAuth consent.
 * Access tokens are short-lived and discarded immediately.
 */
export async function completeGoogleOAuthAction(userId: string, code: string) {
  const tokens = await exchangeCodeForTokens(code);
  // PORTFOLIO MODE: Refresh tokens are NOT stored
  // In production, this would store encrypted refresh tokens:
  // if (tokens.refreshToken) {
  //   await storeRefreshToken(userId, tokens.refreshToken);
  // }
  return tokens.accessToken;
}
