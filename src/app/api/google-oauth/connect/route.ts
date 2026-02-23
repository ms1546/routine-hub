import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleOAuthUrl } from '@/infrastructure/auth/oauth-boundary';
import { getCurrentUser } from '@/infrastructure/auth/session';

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/routines';
  const state = Buffer.from(JSON.stringify({ userId: currentUser.email, returnTo })).toString('base64url');
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/google-oauth/callback`;
  const url = buildGoogleOAuthUrl(state, redirectUri);
  return NextResponse.redirect(url);
}
