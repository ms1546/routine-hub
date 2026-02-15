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

import type { StorybookConfig } from '@storybook/nextjs-vite';
import { mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.stories.@(ts|tsx|mdx)',
  ],

  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  addons: ['@storybook/addon-docs', '@storybook/addon-mcp', '@storybook/addon-vitest'],

  viteFinal: async (config) => {
    // Create a plugin to intercept node:crypto imports as a safety net
    const preventNodeCryptoPlugin = {
      name: 'prevent-node-crypto',
      resolveId(id: string) {
        // Intercept node:crypto imports
        if (id === 'node:crypto') {
          // Return a virtual module that throws an error with a helpful message
          return '\0virtual:node-crypto-error';
        }
        return null;
      },
      load(id: string) {
        if (id === '\0virtual:node-crypto-error') {
          return `
            throw new Error(
              'node:crypto is not available in browser environment. ' +
              'This error indicates that a server-only module was imported. ' +
              'Please check that the Vite aliases are correctly configured.'
            );
          `;
        }
        return null;
      },
    };

    const nextNavigationStub = path.resolve(__dirname, '../stories/next-navigation-stub.ts');
    const nextAuthStub = path.resolve(__dirname, '../stories/next-auth-stub.ts');
    const nextAuthReactStub = path.resolve(__dirname, '../stories/next-auth-react-stub.tsx');
    const nextAuthGoogleProviderStub = path.resolve(__dirname, '../stories/next-auth-provider-google-stub.ts');
    const nextAuthConfigStub = path.resolve(__dirname, '../stories/next-auth-config-stub.ts');

    const alias = [
      // IMPORTANT: More specific aliases must come BEFORE the general '@' alias
      // This ensures that specific paths like '@/shared/utils/uuid.next' are resolved correctly

      // Module resolution-based implementation selection
      // Storybook resolves to .browser.tsx files, Next.js resolves to .next.tsx files
      // This eliminates the need for runtime conditionals (typeof window, require, etc.)

      // IMPORTANT: next/link must be aliased BEFORE app-link.next
      // This prevents next/link from being evaluated when app-link.next.tsx imports it
      { find: 'next/link', replacement: path.resolve(__dirname, '../src/shared/components/app-link.browser.tsx') },

      // UUID: Use browser-safe generator instead of node:crypto
      // This must come before the general '@' alias to ensure proper resolution
      { find: '@/shared/utils/uuid.next', replacement: path.resolve(__dirname, '../src/shared/utils/uuid.browser.ts') },
      { find: '@/shared/utils/uuid.ts', replacement: path.resolve(__dirname, '../src/shared/utils/uuid.storybook.ts') },
      { find: '@/shared/utils/uuid', replacement: path.resolve(__dirname, '../src/shared/utils/uuid.storybook.ts') },

      // Repository: Use browser-safe repository instead of node:crypto
      { find: '@/features/routines/repository', replacement: path.resolve(__dirname, '../src/features/routines/repository.browser.ts') },

      // Routines index: Use browser-safe index that exports browser-safe repository
      { find: '@/features/routines', replacement: path.resolve(__dirname, '../src/features/routines/index.browser.ts') },
      { find: '@/features/routines/index', replacement: path.resolve(__dirname, '../src/features/routines/index.browser.ts') },

      // Navigation: Use browser-safe Link instead of next/link
      { find: '@/shared/components/app-link.next', replacement: path.resolve(__dirname, '../src/shared/components/app-link.browser.tsx') },

      // Auth: Use browser-safe session instead of next-auth
      { find: '@/infrastructure/auth/session.next', replacement: path.resolve(__dirname, '../src/infrastructure/auth/session.browser.ts') },
      { find: '@/infrastructure/auth/next-auth-config', replacement: nextAuthConfigStub },
      { find: /[\\/]src[\\/]infrastructure[\\/]auth[\\/]next-auth-config\.ts$/, replacement: nextAuthConfigStub },
      { find: '@/auth', replacement: nextAuthConfigStub },

      // Calendar: Use browser-safe factory instead of googleapis
      { find: '@/infrastructure/calendar/calendar-client-factory.next', replacement: path.resolve(__dirname, '../src/infrastructure/calendar/calendar-client-factory.browser.ts') },

      // OAuth: Use browser-safe boundary instead of googleapis
      { find: '@/infrastructure/auth/oauth-boundary.next', replacement: path.resolve(__dirname, '../src/infrastructure/auth/oauth-boundary.browser.ts') },

      // Next.js Navigation: Use browser-safe mocks instead of next/navigation
      { find: 'next/navigation', replacement: nextNavigationStub },
      { find: 'next/navigation.js', replacement: nextNavigationStub },
      { find: 'next/navigation.mjs', replacement: nextNavigationStub },
      { find: 'next/dist/client/components/navigation', replacement: nextNavigationStub },
      { find: 'next/dist/client/components/navigation.js', replacement: nextNavigationStub },
      { find: 'next/dist/client/components/navigation.mjs', replacement: nextNavigationStub },

      // Next.js Image: Use a simple <img> stub for Storybook
      { find: 'next/image', replacement: path.resolve(__dirname, '../stories/next-image-stub.tsx') },

      // NextAuth: Stub server-only module in Storybook
      { find: 'next-auth', replacement: nextAuthStub },
      { find: 'next-auth/react', replacement: nextAuthReactStub },
      { find: 'next-auth/providers/google', replacement: nextAuthGoogleProviderStub },
      { find: 'next-auth/providers/google.js', replacement: nextAuthGoogleProviderStub },
      { find: 'next-auth/providers/google.mjs', replacement: nextAuthGoogleProviderStub },

      // Auth Hooks: Use browser-safe hooks instead of next-auth/react
      { find: '@/shared/hooks/use-session.next', replacement: path.resolve(__dirname, '../src/shared/hooks/use-session.browser.tsx') },
      { find: '@/shared/hooks/use-sign-out.next', replacement: path.resolve(__dirname, '../src/shared/hooks/use-sign-out.browser.tsx') },

      // Session Provider: Use browser-safe provider instead of next-auth/react
      { find: '@/shared/components/session-provider.next', replacement: path.resolve(__dirname, '../src/shared/components/session-provider.browser.tsx') },

      // Calendar Actions: Use browser-safe mocks instead of Server Actions
      { find: '@/app/actions/calendar', replacement: path.resolve(__dirname, '../stories/calendar-action-stubs.ts') },
      { find: '@/app/actions/calendar-customization', replacement: path.resolve(__dirname, '../stories/calendar-action-stubs.ts') },

      // Mastra: Stub Node-only dependencies for Storybook
      { find: '@mastra/core/workflows', replacement: path.resolve(__dirname, '../stories/mastra-workflows-stub.ts') },
      { find: '@mastra/core', replacement: path.resolve(__dirname, '../stories/mastra-core-stub.ts') },
      { find: '@mastra/loggers', replacement: path.resolve(__dirname, '../stories/mastra-loggers-stub.ts') },
      { find: 'googleapis', replacement: path.resolve(__dirname, '../stories/googleapis-stub.ts') },
      { find: 'google-auth-library', replacement: path.resolve(__dirname, '../stories/google-auth-library-stub.ts') },
      { find: 'google-logging-utils', replacement: path.resolve(__dirname, '../stories/google-logging-utils-stub.ts') },
      { find: 'gcp-metadata', replacement: path.resolve(__dirname, '../stories/gcp-metadata-stub.ts') },

      // General '@' alias must come LAST to avoid overriding specific aliases
      { find: '@', replacement: path.resolve(__dirname, '../src') },
    ];

    const absoluteAlias = new Map([
      [path.resolve(__dirname, '../src/shared/utils/uuid.next.ts'), path.resolve(__dirname, '../src/shared/utils/uuid.browser.ts')],
      [path.resolve(__dirname, '../src/shared/utils/uuid.ts'), path.resolve(__dirname, '../src/shared/utils/uuid.storybook.ts')],
      [path.resolve(__dirname, '../src/features/routines/repository.ts'), path.resolve(__dirname, '../src/features/routines/repository.browser.ts')],
      [path.resolve(__dirname, '../src/features/routines/index.ts'), path.resolve(__dirname, '../src/features/routines/index.browser.ts')],
      [path.resolve(__dirname, '../src/shared/components/app-link.next.tsx'), path.resolve(__dirname, '../src/shared/components/app-link.browser.tsx')],
      [path.resolve(__dirname, '../src/infrastructure/auth/session.next.ts'), path.resolve(__dirname, '../src/infrastructure/auth/session.browser.ts')],
      [path.resolve(__dirname, '../src/infrastructure/auth/next-auth-config.ts'), nextAuthConfigStub],
      [path.resolve(__dirname, '../src/auth.ts'), nextAuthConfigStub],
      [path.resolve(__dirname, '../src/infrastructure/calendar/calendar-client-factory.next.ts'), path.resolve(__dirname, '../src/infrastructure/calendar/calendar-client-factory.browser.ts')],
      [path.resolve(__dirname, '../src/infrastructure/auth/oauth-boundary.next.ts'), path.resolve(__dirname, '../src/infrastructure/auth/oauth-boundary.browser.ts')],
      [path.resolve(__dirname, '../src/shared/hooks/use-session.next.tsx'), path.resolve(__dirname, '../src/shared/hooks/use-session.browser.tsx')],
      [path.resolve(__dirname, '../src/shared/hooks/use-sign-out.next.tsx'), path.resolve(__dirname, '../src/shared/hooks/use-sign-out.browser.tsx')],
      [path.resolve(__dirname, '../src/shared/components/session-provider.next.tsx'), path.resolve(__dirname, '../src/shared/components/session-provider.browser.tsx')],
      [path.resolve(__dirname, '../src/app/actions/calendar.ts'), path.resolve(__dirname, '../stories/calendar-action-stubs.ts')],
      [path.resolve(__dirname, '../src/app/actions/calendar-customization.ts'), path.resolve(__dirname, '../stories/calendar-action-stubs.ts')]
    ]);

    const subpathAlias = new Map([
      ['src/shared/utils/uuid.next.ts', path.resolve(__dirname, '../src/shared/utils/uuid.browser.ts')],
      ['src/shared/utils/uuid.ts', path.resolve(__dirname, '../src/shared/utils/uuid.storybook.ts')],
      ['src/features/routines/repository.ts', path.resolve(__dirname, '../src/features/routines/repository.browser.ts')],
      ['src/features/routines/index.ts', path.resolve(__dirname, '../src/features/routines/index.browser.ts')],
      ['src/shared/components/app-link.next.tsx', path.resolve(__dirname, '../src/shared/components/app-link.browser.tsx')],
      ['src/infrastructure/auth/session.next.ts', path.resolve(__dirname, '../src/infrastructure/auth/session.browser.ts')],
      ['src/infrastructure/auth/next-auth-config.ts', nextAuthConfigStub],
      ['src/auth.ts', nextAuthConfigStub],
      ['src/infrastructure/calendar/calendar-client-factory.next.ts', path.resolve(__dirname, '../src/infrastructure/calendar/calendar-client-factory.browser.ts')],
      ['src/infrastructure/auth/oauth-boundary.next.ts', path.resolve(__dirname, '../src/infrastructure/auth/oauth-boundary.browser.ts')],
      ['src/shared/hooks/use-session.next.tsx', path.resolve(__dirname, '../src/shared/hooks/use-session.browser.tsx')],
      ['src/shared/hooks/use-sign-out.next.tsx', path.resolve(__dirname, '../src/shared/hooks/use-sign-out.browser.tsx')],
      ['src/shared/components/session-provider.next.tsx', path.resolve(__dirname, '../src/shared/components/session-provider.browser.tsx')],
      ['src/app/actions/calendar.ts', path.resolve(__dirname, '../stories/calendar-action-stubs.ts')],
      ['src/app/actions/calendar-customization.ts', path.resolve(__dirname, '../stories/calendar-action-stubs.ts')]
    ]);

    const forceStorybookAliasPlugin = {
      name: 'force-storybook-alias',
      enforce: 'pre',
      resolveId(id: string, importer?: string) {
        const cleanedId = id.split('?')[0] ?? id;
        const isNextNavigation = (
          cleanedId === 'next/navigation' ||
          cleanedId === 'next/navigation.js' ||
          cleanedId === 'next/navigation.mjs' ||
          cleanedId.endsWith('/next/navigation') ||
          cleanedId.endsWith('/next/navigation.js') ||
          cleanedId.endsWith('/next/navigation.mjs') ||
          cleanedId.endsWith('/node_modules/next/dist/client/components/navigation.js') ||
          cleanedId.endsWith('/node_modules/next/dist/client/components/navigation.mjs') ||
          cleanedId.endsWith('/node_modules/next/dist/client/components/navigation')
        );
        if (isNextNavigation) {
          return nextNavigationStub;
        }
        const isNextAuth = (
          cleanedId === 'next-auth' ||
          cleanedId === 'next-auth/react' ||
          cleanedId === 'next-auth/providers/google' ||
          cleanedId === 'next-auth/providers/google.js' ||
          cleanedId === 'next-auth/providers/google.mjs' ||
          cleanedId.endsWith('/node_modules/next-auth') ||
          cleanedId.endsWith('/node_modules/next-auth/index.js') ||
          cleanedId.endsWith('/node_modules/next-auth/index.mjs') ||
          cleanedId.endsWith('/node_modules/next-auth/react/index.js') ||
          cleanedId.endsWith('/node_modules/next-auth/react/index.mjs') ||
          cleanedId.endsWith('/node_modules/next-auth/providers/google.js') ||
          cleanedId.endsWith('/node_modules/next-auth/providers/google.mjs')
        );
        if (isNextAuth) {
          if (cleanedId.includes('providers/google')) return nextAuthGoogleProviderStub;
          if (cleanedId.includes('next-auth/react')) return nextAuthReactStub;
          return nextAuthStub;
        }
        if (
          cleanedId === '@/infrastructure/auth/next-auth-config' ||
          cleanedId.endsWith('/src/infrastructure/auth/next-auth-config.ts') ||
          cleanedId === '@/auth' ||
          cleanedId.endsWith('/src/auth.ts')
        ) {
          return nextAuthConfigStub;
        }
        if (importer) {
          const cleanedImporter = importer.split('?')[0] ?? importer;
          if (
            cleanedImporter.endsWith('/src/infrastructure/auth/session.next.ts') &&
            (cleanedId === './next-auth-config' || cleanedId === './next-auth-config.ts')
          ) {
            return nextAuthConfigStub;
          }
          if (
            cleanedImporter.endsWith('/src/auth.ts') &&
            (cleanedId === './infrastructure/auth/next-auth-config' ||
              cleanedId === './infrastructure/auth/next-auth-config.ts')
          ) {
            return nextAuthConfigStub;
          }
        }
        const direct = alias.find((entry) => typeof entry.find === 'string' && entry.find === cleanedId);
        if (direct) return direct.replacement;
        const absolute = absoluteAlias.get(cleanedId);
        if (absolute) return absolute;
        for (const [subpath, replacement] of subpathAlias.entries()) {
          if (cleanedId.endsWith(subpath)) {
            return replacement;
          }
        }
        return null;
      },
      load(id: string) {
        const cleanedId = id.split('?')[0] ?? id;
        if (cleanedId === path.resolve(__dirname, '../src/shared/utils/uuid.next.ts') || cleanedId.endsWith('src/shared/utils/uuid.next.ts')) {
          const storybookUUID = path.resolve(__dirname, '../src/shared/utils/uuid.storybook.ts');
          return `export * from ${JSON.stringify(storybookUUID)};`;
        }
        return null;
      }
    };

    const normalizeAlias = (value: typeof config.resolve.alias | undefined) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      return Object.entries(value).map(([find, replacement]) => ({ find, replacement }));
    };

    const baseAlias = normalizeAlias(config.resolve?.alias);
    const baseAliasFiltered = baseAlias.filter((entry) => entry.find !== '@');
    const mergedAlias = [...alias, ...baseAliasFiltered];

    return mergeConfig(config, {
      plugins: [forceStorybookAliasPlugin, preventNodeCryptoPlugin],
      resolve: {
        alias: mergedAlias
      },
      optimizeDeps: {
        exclude: [
          'node:crypto',
          'googleapis',
          'google-auth-library',
          'google-logging-utils',
          'gcp-metadata',
          'next-auth',
          'next-auth/react',
          'next-auth/providers/google'
        ],
      },
    });
  },
};

export default config;
