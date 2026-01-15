const path = require('node:path');

module.exports = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/nextjs',
    options: {
      nextConfigPath: '../next.config.mjs'
    }
  },
  docs: {
    autodocs: 'tag'
  },
  staticDirs: ['../public'],
  webpackFinal: async (baseConfig) => {
    baseConfig.resolve = baseConfig.resolve || {};
    baseConfig.resolve.alias = {
      ...baseConfig.resolve.alias,
      'next/config': path.join(__dirname, 'next-config-stub.js'),
      // @/ エイリアスを src/ と stories/ の両方から解決できるようにする
      '@': path.resolve(__dirname, '../src')
    };

    // Node.js組み込みモジュールを除外（node: プレフィックス付きも含む）
    baseConfig.resolve.fallback = {
      ...baseConfig.resolve.fallback,
      net: false,
      tls: false,
      child_process: false,
      http2: false,
      crypto: false,
      'node:crypto': false,
      events: false,
      'node:events': false,
      process: false,
      'node:process': false,
      util: false,
      'node:util': false,
      stream: false,
      fs: false,
      path: false,
      os: false
    };

    // サーバーサイド専用のモジュールを除外
    baseConfig.resolve.alias = {
      ...baseConfig.resolve.alias,
      'googleapis': false,
      'google-auth-library': false,
      'googleapis-common': false,
      // Google Calendarクライアントをモックに置き換え
      '@/features/calendar/domain/google-client': path.resolve(__dirname, '../src/features/calendar/domain/mock-client.ts')
    };

    // stories/ ディレクトリから @/stories/ を解決できるようにする
    baseConfig.resolve.modules = [
      ...(baseConfig.resolve.modules || []),
      path.resolve(__dirname, '../')
    ];

    return baseConfig;
  }
};
