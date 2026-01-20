import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      // Server-only modules をモックに置き換え
      '@/app/actions/calendar-customization': path.resolve(__dirname, '../stories/calendar-customization-action-stub.ts'),
      '@/app/actions/calendar': path.resolve(__dirname, '../stories/calendar-action-stub.ts'),
      '@/features/routines/domain/store': path.resolve(__dirname, '../stories/routines-domain-store-stub.ts'),
      '@mastra/loggers': path.resolve(__dirname, '../stories/mastra-loggers-stub.ts'),
      'googleapis': path.resolve(__dirname, '../stories/googleapis-stub.ts'),
      '@/infrastructure/auth/oauth-boundary': path.resolve(__dirname, '../stories/oauth-boundary-stub.ts'),
      '@/features/calendar/domain/google-client': path.resolve(__dirname, '../stories/google-client-stub.ts'),
      'node:crypto': path.resolve(__dirname, '../stories/crypto-stub.ts'),
      'secure-json-parse': path.resolve(__dirname, '../stories/secure-json-parse-stub.ts'),
      '@vercel/oidc': path.resolve(__dirname, '../stories/vercel-oidc-stub.ts'),
      '@isaacs/ttlcache': path.resolve(__dirname, '../stories/ttlcache-stub.ts'),
      'base64-js': path.resolve(__dirname, '../stories/base64-js-stub.ts'),
      'dotenv': path.resolve(__dirname, '../stories/dotenv-stub.js'),
      'dotenv/lib/main': path.resolve(__dirname, '../stories/dotenv-stub.js'),
      'dotenv/lib/main.js': path.resolve(__dirname, '../stories/dotenv-stub.js')
    }
  },
  define: {
    'process.env': {},
    'global': 'globalThis',
    '__dirname': JSON.stringify('/'),
    '__filename': JSON.stringify('/index.js')
  },
  optimizeDeps: {
    exclude: ['googleapis', 'google-auth-library', 'googleapis-common', '@mastra/core', 'dotenv']
  }
});
