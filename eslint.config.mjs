// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextConfig from 'eslint-config-next';

const config = [
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'node_modules/**',
      'storybook-static/**'
    ]
  },
  ...nextConfig,
  {
    rules: {
      'react/jsx-props-no-spreading': 'off'
    }
  },
  ...storybook.configs["flat/recommended"]
];

export default config;
