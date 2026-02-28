/** GCP の承認済みリダイレクト URI と一致させるためのベース URL。APP_URL 未設定時は request origin を使用 */
export function getOAuthRedirectBase(requestOrigin: string): string {
  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  return base ? base.replace(/\/$/, '') : requestOrigin;
}

export const OAUTH_CALLBACK_PATH = '/api/google-oauth/callback';
