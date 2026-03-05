/**
 * NextAuth Configuration (Server-only)
 *
 * This file contains NextAuth configuration and should NEVER be imported
 * in browser contexts (Storybook, client components, etc.).
 *
 * Clean Architecture: This is an infrastructure adapter that provides
 * authentication services for the application.
 */

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { userSettingsRepository } from '@/features/users';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // NextAuth.js v5でリダイレクトURIを自動検出
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile',
          access_type: 'online',
          prompt: 'consent'
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        // userSettingsからdisplayNameを取得してセッションに含める
        // UserSettings のキーは user.id で管理しているため、まず id を優先し、なければ email を使う
        const userId = session.user.id ?? session.user.email ?? '';
        if (userId) {
          const settings = await userSettingsRepository.get(userId);
          session.user.displayName = settings?.displayName ?? session.user.name ?? null;
        }
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  }
});
