// Storybook用モック: base64-js
// browser-safe stub

export function toByteArray(b64: string): Uint8Array {
  // 簡易的なbase64デコード（Storybook用のモック）
  try {
    const binaryString = atob(b64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch {
    return new Uint8Array(0);
  }
}

export function fromByteArray(bytes: Uint8Array): string {
  // 簡易的なbase64エンコード（Storybook用のモック）
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// default export も提供（依存が default import しても落ちない）
export default {
  toByteArray,
  fromByteArray
};
