// Storybook用モック: dotenv
// browser-safe stub

function parse(_src) {
  // Storybookでは環境変数のパースは行わない
  return {};
}

function config(_options) {
  // Storybookでは環境変数の読み込みは行わない
  return { parsed: {} };
}

// CommonJS形式でエクスポート（dotenv/lib/main.jsがCommonJS形式のため）
const dotenvModule = {
  parse,
  config
};

// ESM形式のエクスポート
export { parse, config };
export default dotenvModule;

// CommonJS形式のエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = dotenvModule;
  module.exports.parse = parse;
  module.exports.config = config;
  module.exports.default = dotenvModule;
}
