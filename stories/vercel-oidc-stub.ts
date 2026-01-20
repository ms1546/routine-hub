// Storybook用のモック: @vercel/oidc
// ブラウザ環境では使用できないため、モックに置き換える

export function getContext() {
  return {
    issuer: 'https://accounts.google.com',
    clientId: 'mock-client-id',
    clientSecret: 'mock-client-secret',
    redirectUri: 'http://localhost:3000/auth/callback'
  };
}

export async function getVercelOidcToken(_code: string, _context?: any): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}> {
  return {
    access_token: 'mock-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'mock-refresh-token'
  };
}

// その他の必要なエクスポートがあれば追加
export default {
  getContext,
  getVercelOidcToken
};
