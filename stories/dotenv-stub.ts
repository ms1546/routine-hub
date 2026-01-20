// Storybook用モック: dotenv
// browser-safe stub

// named export
export function parse(_src: string | Buffer): Record<string, string> {
  // Storybookでは環境変数のパースは行わない
  return {};
}

export function config(_options?: { path?: string; encoding?: string }): { parsed?: Record<string, string>; error?: Error } {
  // Storybookでは環境変数の読み込みは行わない
  return { parsed: {} };
}

// default export も提供（依存が default import しても落ちない）
const dotenvModule = {
  parse,
  config
};

export default dotenvModule;

// CommonJS互換性のため（dotenv/lib/main.jsがCommonJS形式のため）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = dotenvModule;
  module.exports.parse = parse;
  module.exports.config = config;
  module.exports.default = dotenvModule;
}
