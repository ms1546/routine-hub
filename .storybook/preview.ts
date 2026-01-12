import type { Preview } from '@storybook/react';
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'hub-dark',
      values: [
        { name: 'hub-dark', value: '#050709' },
        { name: 'neutral', value: '#11131a' }
      ]
    },
    layout: 'fullscreen'
  }
};

export default preview;
