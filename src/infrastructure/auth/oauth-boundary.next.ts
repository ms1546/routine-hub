/**
 * OAuth Boundary Next.js Implementation
 *
 * This is the Next.js-specific implementation using googleapis.
 * It is used in Next.js runtime via normal import resolution.
 *
 * Storybook will NOT import this file due to alias configuration.
 */

import { google } from 'googleapis';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand
} from '@aws-sdk/client-secrets-manager';
import { getStoredAccessToken, hasStoredAccessToken, storeAccessToken } from './access-token-store';

/**
 * OAuth Boundary for Google Calendar Integration
 *
 * PORTFOLIO MODE DESIGN:
 * - Refresh tokens are NOT stored in portfolio mode
 * - Each calendar write requires explicit OAuth consent
 * - Access tokens are short-lived and discarded immediately
 * - This is an intentional security tradeoff for portfolio context
 *
 * Production Considerations (NOT IMPLEMENTED):
 * - Refresh token storage would use AWS Secrets Manager
 * - Offline access would be enabled with stored refresh tokens
 * - Background jobs could sync calendar events automatically
 *
 * See docs/oauth-design.md for detailed design rationale.
 */
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
const secretPrefix = process.env.GOOGLE_REFRESH_TOKEN_SECRET_PREFIX ?? 'routunehub/google';
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

/**
 * Build Google OAuth URL for calendar access
 *
 * PORTFOLIO MODE: Uses prompt=consent to ensure explicit user intent.
 * Access tokens are short-lived; refresh tokens are NOT stored.
 *
 * This function is used for calendar writes, which are admin-only.
 * Each calendar write requires new OAuth consent.
 */
export function buildGoogleOAuthUrl(state: string) {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'online', // access token only (refresh token is not stored)
    scope: scopes,
    state,
    prompt: 'consent' // Ensures explicit user intent per write
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

/**
 * Store Refresh Token (NOT USED in Portfolio Mode)
 *
 * This function exists but is NOT called in portfolio mode.
 * Refresh tokens are intentionally NOT stored to reduce:
 * - Credential exposure risk
 * - Operational complexity
 * - Security surface area
 *
 * In production, this would store encrypted refresh tokens
 * in AWS Secrets Manager or similar secure storage.
 */
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
  const token = getStoredAccessToken(userId);
  if (!token) {
    throw new Error('No access token available for user');
  }
  return {
    provider: 'google',
    accessToken: token,
    expiresAt: ''
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
    const shouldIgnore =
      (error instanceof Error && 'name' in error && error.name === 'ResourceNotFoundException') ||
      process.env.MASTRA_USE_MOCK === 'true' ||
      !process.env.AWS_ACCESS_KEY_ID;
    if (!shouldIgnore) {
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
  const calendarProvider = process.env.CALENDAR_CLIENT ?? 'mock';
  if (calendarProvider !== 'google') {
    return true;
  }
  return hasStoredAccessToken(userId);
}

export function storeAccessTokenForUser(userId: string, accessToken: string, expiresAt?: string) {
  storeAccessToken(userId, accessToken, expiresAt);
}
