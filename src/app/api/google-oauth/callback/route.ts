import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, storeAccessTokenForUser } from '@/infrastructure/auth/oauth-boundary';
import { getCurrentUser } from '@/infrastructure/auth/session';

type OAuthState = {
  userId: string;
  returnTo?: string;
};

const parseState = (state: string | null): OAuthState | null => {
  if (!state) return null;
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8');
    return JSON.parse(decoded) as OAuthState;
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = parseState(request.nextUrl.searchParams.get('state'));
  const currentUser = await getCurrentUser();

  if (!code || !state) {
    return NextResponse.redirect(new URL('/auth/error?reason=oauth', request.url));
  }

  if (state.userId && state.userId !== currentUser.id && state.userId !== currentUser.email) {
    return NextResponse.redirect(new URL('/auth/error?reason=oauth_mismatch', request.url));
  }

  const redirectUri = `${request.nextUrl.origin}/api/google-oauth/callback`;

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (tokens.accessToken) {
      storeAccessTokenForUser(state.userId, tokens.accessToken, tokens.expiresAt);
    }
  } catch (error) {
    console.error('[GoogleOAuthCallback] token exchange failed', error);
    return NextResponse.redirect(new URL('/auth/error?reason=oauth_exchange', request.url));
  }

  const returnTo = state.returnTo ?? '/routines';
  return NextResponse.redirect(new URL(returnTo, request.url));
}
