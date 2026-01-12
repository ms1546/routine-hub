const { readFileSync, writeFileSync, existsSync } = require('fs');
const { resolve } = require('path');

const projectRoot = resolve(__dirname, '..');
const targetDir = resolve(projectRoot, 'node_modules', 'next');
const targetFile = resolve(targetDir, 'config.js');
const stubFile = resolve(projectRoot, '.storybook', 'next-config-stub.js');

if (!existsSync(stubFile) || !existsSync(targetDir)) {
  process.exit(0);
}

try {
  const current = existsSync(targetFile) ? readFileSync(targetFile, 'utf8') : '';
  const stub = readFileSync(stubFile, 'utf8');
  if (current.trim() === stub.trim()) {
    process.exit(0);
  }
  writeFileSync(targetFile, stub);
  console.log('Wrote Next.js config stub to node_modules/next/config.js');
} catch (error) {
  console.warn('Failed to ensure next/config stub', error);
}
