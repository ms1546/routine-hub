// addons/mcp-addon/preview.ts

export class BrowserMCPClient {
  ws: WebSocket | null = null;
  serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  async connect() {
    this.ws = new WebSocket(this.serverUrl);
    await new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject();
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
    });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

let client: BrowserMCPClient | null = null;

export function getMCPClient() {
  if (!client) {
    client = new BrowserMCPClient(
      import.meta.env?.STORYBOOK_MCP_SERVER_URL ?? 'ws://localhost:3001/mcp'
    );
  }
  return client;
}
