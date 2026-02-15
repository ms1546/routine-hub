import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleOAuthUrl } from '@/infrastructure/auth/oauth-boundary';
import { getCurrentUser } from '@/infrastructure/auth/session';

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/routines';
  const state = Buffer.from(JSON.stringify({ userId: currentUser.email, returnTo })).toString('base64url');
  const url = buildGoogleOAuthUrl(state);
  return NextResponse.redirect(url);
}
