const path = require('node:path');

module.exports = {
  stories: ['../src/components/**/*.stories.@(ts|tsx)', '../stories/**/*.stories.@(ts|tsx)'],
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
      'next/config': path.join(__dirname, 'next-config-stub.js')
    };
    return baseConfig;
  }
};
