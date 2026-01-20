// Storybook用のモック: oauth-boundary
// googleapisを使用するため、モックに置き換える

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

export function buildGoogleOAuthUrl(_state: string): string {
  return 'https://accounts.google.com/o/oauth2/v2/auth?mock=true';
}

export async function exchangeCodeForTokens(_code: string): Promise<TokenExchangeResult> {
  return {
    accessToken: 'mock-access-token',
    expiresAt: new Date(Date.now() + 3600_000).toISOString()
  };
}

export async function getAccessTokenForUser(_userId: string): Promise<{ accessToken: string }> {
  return {
    accessToken: 'mock-access-token'
  };
}
