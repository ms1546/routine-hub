export type OAuthSession = {
  provider: 'google';
  userId: string;
  accessToken: string;
  expiresAt: string;
};

export async function getCalendarOAuthSession(userId: string): Promise<OAuthSession> {
  // Phase 3-A mock session. Real implementation will exchange a refresh token.
  return {
    provider: 'google',
    userId,
    accessToken: 'mock-access-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
}
