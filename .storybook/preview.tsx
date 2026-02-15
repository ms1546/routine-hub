import React from 'react';
import '../src/app/globals.css';

// Note: We don't initialize routinesRepository here because:
// 1. store.ts appears to be empty (needs investigation)
// 2. repository.ts initializes with createNodeUUIDGenerator which would cause node:crypto errors
// 3. Storybook stories should use mocked/stubbed implementations instead
// If routinesRepository is needed in stories, it should be mocked at the story level

// MCP addon（そのまま維持）
let getMCPClient: (() => any) | null = null;
try {
  const mcpModule = await import('./addons/mcp-addon/preview.js');
  getMCPClient = mcpModule.getMCPClient;
} catch {
  console.warn('[Storybook] MCP addon not available');
}

const MCPContext = React.createContext<{ client: any | null }>({ client: null });

// 実際のappと同じ構造にするためのデコレータ
// Interフォントはpreview-head.htmlでGoogle Fontsから読み込まれる
const WithAppLayout = (Story: any) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'hsl(var(--background))',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      }}
      className="antialiased"
    >
      <Story />
    </div>
  );
};

const WithMCP = (Story: any) => {
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

const preview = {
  decorators: [WithAppLayout, WithMCP],
  parameters: {
    layout: 'fullscreen',
    // 実際のappと同じ明るいテーマを使用
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: 'hsl(var(--background))' },
        { name: 'muted', value: 'hsl(var(--muted))' },
        { name: 'card', value: 'hsl(var(--card))' },
      ],
    },
  },
};

export default preview;

export function useMCP() {
  return React.useContext(MCPContext).client;
}
