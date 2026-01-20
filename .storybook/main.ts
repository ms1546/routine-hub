/**
 * Storybook Configuration
 *
 * This configuration uses module resolution (alias) to select browser-safe
 * implementations for Storybook. No runtime conditionals are needed.
 *
 * Best Practice: Storybook should run in a pure browser environment.
 * Next.js-specific modules (next/link, next-auth, googleapis, node:crypto)
 * are never imported due to alias configuration.
 */

import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.stories.@(ts|tsx)',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  viteFinal: async (config) => {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src'),

          // Module resolution-based implementation selection
          // Storybook resolves to .browser.tsx files, Next.js resolves to .next.tsx files
          // This eliminates the need for runtime conditionals (typeof window, require, etc.)

          // Navigation: Use browser-safe Link instead of next/link
          '@/shared/components/app-link.next': path.resolve(__dirname, '../src/shared/components/app-link.browser.tsx'),

          // Auth: Use browser-safe session instead of next-auth
          '@/infrastructure/auth/session.next': path.resolve(__dirname, '../src/infrastructure/auth/session.browser.ts'),

          // Calendar: Use browser-safe factory instead of googleapis
          '@/infrastructure/calendar/calendar-client-factory.next': path.resolve(__dirname, '../src/infrastructure/calendar/calendar-client-factory.browser.ts'),

          // OAuth: Use browser-safe boundary instead of googleapis
          '@/infrastructure/auth/oauth-boundary.next': path.resolve(__dirname, '../src/infrastructure/auth/oauth-boundary.browser.ts'),

          // UUID: Use browser-safe generator instead of node:crypto
          '@/shared/utils/uuid.next': path.resolve(__dirname, '../src/shared/utils/uuid.browser.ts'),

          // Next.js Navigation: Use browser-safe mocks instead of next/navigation
          'next/navigation': path.resolve(__dirname, '../stories/next-navigation-stub.ts'),

          // Auth Hooks: Use browser-safe hooks instead of next-auth/react
          '@/shared/hooks/use-session.next': path.resolve(__dirname, '../src/shared/hooks/use-session.browser.tsx'),
          '@/shared/hooks/use-sign-out.next': path.resolve(__dirname, '../src/shared/hooks/use-sign-out.browser.tsx'),

          // Session Provider: Use browser-safe provider instead of next-auth/react
          '@/shared/components/session-provider.next': path.resolve(__dirname, '../src/shared/components/session-provider.browser.tsx'),
        },
      },
    });
  },
};

export default config;
