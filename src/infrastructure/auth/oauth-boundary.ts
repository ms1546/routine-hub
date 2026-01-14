import { google } from 'googleapis';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand
} from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
const secretPrefix = process.env.GOOGLE_REFRESH_TOKEN_SECRET_PREFIX ?? 'routinehub/google';
const scopes = ['https://www.googleapis.com/auth/calendar.events'];

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

function getOAuthClient() {
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    throw new Error('Missing Google OAuth client configuration');
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

export function buildGoogleOAuthUrl(state: string) {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state,
    prompt: 'consent'
  });
}

export async function exchangeCodeForTokens(code: string): Promise<TokenExchangeResult> {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return {
    accessToken: tokens.access_token ?? '',
    refreshToken: tokens.refresh_token ?? undefined,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined
  };
}

export async function storeRefreshToken(userId: string, refreshToken: string) {
  const secretId = `${secretPrefix}/${userId}`;
  await secretsClient.send(
    new PutSecretValueCommand({
      SecretId: secretId,
      SecretString: JSON.stringify({ refreshToken })
    })
  );
}

export async function getAccessTokenForUser(userId: string): Promise<OAuthSession> {
  const refreshToken = await getRefreshTokenForUser(userId);
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return {
    provider: 'google',
    accessToken: credentials.access_token ?? '',
    expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : ''
  };
}

async function fetchStoredRefreshToken(userId: string): Promise<string | null> {
  const secretId = `${secretPrefix}/${userId}`;
  try {
    const result = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
    if (result.SecretString) {
      const parsed = JSON.parse(result.SecretString);
      if (typeof parsed.refreshToken === 'string') {
        return parsed.refreshToken;
      }
    }
  } catch (error) {
    if (!(error instanceof Error && 'name' in error && error.name === 'ResourceNotFoundException')) {
      throw error;
    }
  }

  const envKey = `GOOGLE_REFRESH_TOKEN_${userId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const fallback = process.env[envKey];
  return fallback ?? null;
}

async function getRefreshTokenForUser(userId: string): Promise<string> {
  const token = await fetchStoredRefreshToken(userId);
  if (!token) {
    throw new Error('No refresh token available for user');
  }
  return token;
}

export async function hasStoredRefreshToken(userId: string): Promise<boolean> {
  const token = await fetchStoredRefreshToken(userId);
  return Boolean(token);
}
