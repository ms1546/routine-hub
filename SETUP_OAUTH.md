# Google OAuth設定ガイド

## エラー: redirect_uri_mismatch の解決方法

### 問題
NextAuth.js v5のリダイレクトURIとGoogle Cloud Consoleで登録されているURIが一致していません。

### NextAuth.js v5のリダイレクトURI
NextAuth.js v5では、リダイレクトURIは自動的に以下の形式になります：
- 開発環境: `http://localhost:3000/api/auth/callback/google`
- 本番環境: `https://yourdomain.com/api/auth/callback/google`

### 解決手順

#### 1. Google Cloud ConsoleでリダイレクトURIを登録

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」に移動
4. OAuth 2.0 クライアント IDを選択（または新規作成）
5. 「承認済みのリダイレクト URI」に以下を追加：

**開発環境:**
```
http://localhost:3000/api/auth/callback/google
```

**本番環境（デプロイ後）:**
```
https://yourdomain.com/api/auth/callback/google
```

#### 2. 環境変数の確認

`.env.local`ファイルに以下が設定されていることを確認：

```env
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=http://localhost:3000
```

**注意:**
- `GOOGLE_OAUTH_REDIRECT_URI`は不要です（NextAuth.js v5が自動で設定します）
- `NEXTAUTH_SECRET`は本番環境では必須です（ランダムな文字列を生成してください）

#### 3. NEXTAUTH_SECRETの生成方法

```bash
openssl rand -base64 32
```

または

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 確認事項

- [ ] Google Cloud Consoleで `/api/auth/callback/google` が登録されている
- [ ] `.env.local`に `NEXTAUTH_URL` が設定されている
- [ ] `.env.local`に `NEXTAUTH_SECRET` が設定されている（本番環境では必須）
- [ ] 開発サーバーを再起動している

### トラブルシューティング

#### まだエラーが出る場合

1. ブラウザのキャッシュをクリア
2. 開発サーバーを再起動: `npm run dev`
3. Google Cloud ConsoleでリダイレクトURIが正しく登録されているか再確認
4. ブラウザのコンソールでエラーメッセージを確認

#### リダイレクトURIの形式

NextAuth.js v5では、リダイレクトURIは以下の形式です：
- パス: `/api/auth/callback/[provider]`
- プロバイダーが `google` の場合: `/api/auth/callback/google`
- 完全なURI: `http://localhost:3000/api/auth/callback/google`
