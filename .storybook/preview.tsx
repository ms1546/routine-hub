import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/app/globals.css';

// Initialize UUID generator for Storybook (browser-safe)
// This ensures domain layer uses browser-compatible UUID generation
// Note: '@/shared/utils/uuid' resolves to uuid.browser.ts via alias in main.ts
import { createBrowserUUIDGenerator } from '@/shared/utils/uuid';
import { createRoutinesRepository } from '../src/features/routines/domain/store';

// Initialize routines repository with browser-safe UUID generator
// This prevents node:crypto from being imported in Storybook
const browserUUIDGenerator = createBrowserUUIDGenerator();
createRoutinesRepository(browserUUIDGenerator);

// MCP addon（そのまま維持）
let getMCPClient: (() => any) | null = null;
try {
  const mcpModule = await import('./addons/mcp-addon/preview.js');
  getMCPClient = mcpModule.getMCPClient;
} catch {
  console.warn('[Storybook] MCP addon not available');
}

const MCPContext = React.createContext<{ client: any | null }>({ client: null });

const withMCP = (Story: any) => {
  const [client, setClient] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!getMCPClient) return;
    const c = getMCPClient();
    setClient(c);
    return () => c?.disconnect?.();
  }, []);

  return (
    <MCPContext.Provider value={{ client }}>
      <Story />
    </MCPContext.Provider>
  );
};

const preview: Preview = {
  decorators: [withMCP],
  parameters: {
    layout: 'fullscreen',


    backgrounds: {
      default: 'hub-dark',
      values: [
        { name: 'hub-dark', value: '#050709' },
        { name: 'neutral', value: '#11131a' },
      ],
    },
  },
};

export default preview;

export function useMCP() {
  return React.useContext(MCPContext).client;
}
