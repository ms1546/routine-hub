import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleOAuthUrl } from '@/infrastructure/auth/oauth-boundary';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { getOAuthRedirectBase, OAUTH_CALLBACK_PATH } from '../utils';

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/routines';
  const state = Buffer.from(JSON.stringify({ userId: currentUser.email, returnTo })).toString('base64url');
  const base = getOAuthRedirectBase(request.nextUrl.origin);
  const redirectUri = `${base}${OAUTH_CALLBACK_PATH}`;
  console.log('[GoogleOAuth] redirect_uri=', redirectUri, 'base=', base, 'origin=', request.nextUrl.origin);

  // 原因切り分け用: ?debug=1 で redirect_uri を確認（本番では削除推奨）
  if (request.nextUrl.searchParams.get('debug') === '1') {
    return Response.json({
      redirect_uri: redirectUri,
      base,
      app_url: process.env.APP_URL ?? null,
      next_public_app_url: process.env.NEXT_PUBLIC_APP_URL ?? null,
      request_origin: request.nextUrl.origin,
      gcp_expected: 'https://routunehub.com/api/google-oauth/callback',
      match: redirectUri === 'https://routunehub.com/api/google-oauth/callback'
    });
  }

  const url = buildGoogleOAuthUrl(state, redirectUri);
  return NextResponse.redirect(url);
}
