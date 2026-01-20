import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/app/globals.css';

import { getMCPClient } from './addons/mcp-addon/preview';

// MCP Context
export const MCPContext = React.createContext<any>(null);

// MCP Decorator
const withMCP = (Story: any) => {
  const [client, setClient] = React.useState<any>(null);

  React.useEffect(() => {
    const c = getMCPClient();
    setClient(c);

    c.connect?.().catch(() => {
      console.warn('[Storybook] MCP not connected');
    });

    return () => c.disconnect?.();
  }, []);

  return (
    <MCPContext.Provider value={client}>
      <Story />
    </MCPContext.Provider>
  );
};

const preview: Preview = {
  decorators: [withMCP],
  parameters: {
    layout: 'fullscreen',
  },
};

export default preview;
