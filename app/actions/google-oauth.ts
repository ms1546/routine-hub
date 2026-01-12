'use server';

import { buildGoogleOAuthUrl, exchangeCodeForTokens, storeRefreshToken } from '@/lib/auth/oauth-boundary';

export function getGoogleOAuthUrlAction(userId: string) {
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
  return buildGoogleOAuthUrl(state);
}

export async function completeGoogleOAuthAction(userId: string, code: string) {
  const tokens = await exchangeCodeForTokens(code);
  if (tokens.refreshToken) {
    await storeRefreshToken(userId, tokens.refreshToken);
  }
  return tokens.accessToken;
}
