const fs = require('fs');
const path = require('path');

// node_modules/next/config.js が存在しない場合、スタブファイルをコピー
const nextConfigStub = path.join(__dirname, '../.storybook/next-config-stub.js');
const nextConfigTarget = path.join(__dirname, '../node_modules/next/config.js');
const nextDir = path.dirname(nextConfigTarget);

if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
}

if (!fs.existsSync(nextConfigTarget)) {
  fs.copyFileSync(nextConfigStub, nextConfigTarget);
  console.log('[Storybook] Created node_modules/next/config.js stub');
}
