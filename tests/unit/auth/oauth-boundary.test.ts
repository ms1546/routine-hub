import { describe, it, beforeEach, expect, vi } from 'vitest';

const generateAuthUrl = vi.fn(() => 'https://accounts.google.com/o/oauth2/auth?state=test');
const getToken = vi.fn(() => Promise.resolve({ tokens: { access_token: 'access', refresh_token: 'refresh' } }));
const refreshAccessToken = vi.fn(() =>
  Promise.resolve({ credentials: { access_token: 'new-access', expiry_date: Date.now() + 3600 } })
);
const setCredentials = vi.fn();

class MockOAuth2 {
  generateAuthUrl = generateAuthUrl;
  getToken = getToken;
  refreshAccessToken = refreshAccessToken;
  setCredentials = setCredentials;
  constructor() {}
}

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: MockOAuth2
    }
  }
}));

const sendMock = vi.fn();
vi.mock('@aws-sdk/client-secrets-manager', () => {
  class SecretsManagerClientMock {
    send = sendMock;
  }
  class CommandMock {
    constructor(public input: unknown) {}
  }
  return {
    SecretsManagerClient: SecretsManagerClientMock,
    GetSecretValueCommand: CommandMock,
    PutSecretValueCommand: CommandMock
  };
});

describe('oauth boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'client-id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://example.com/callback';
    process.env.AWS_REGION = 'us-east-1';
  });

  it('generates authorization URL with encoded state', async () => {
    const { buildGoogleOAuthUrl } = await import('@/infrastructure/auth/oauth-boundary');
    const url = buildGoogleOAuthUrl('state-123');
    expect(url).toContain('state=');
    expect(generateAuthUrl).toHaveBeenCalled();
  });

  it('exchanges code for tokens via OAuth client', async () => {
    const { exchangeCodeForTokens } = await import('@/infrastructure/auth/oauth-boundary');
    const tokens = await exchangeCodeForTokens('code-123');
    expect(getToken).toHaveBeenCalledWith('code-123');
    expect(tokens.accessToken).toBe('access');
    expect(tokens.refreshToken).toBe('refresh');
  });
});
