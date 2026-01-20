/**
 * UUID Generator Next.js Implementation
 *
 * This is the Next.js-specific implementation using node:crypto.
 * It is used in Next.js runtime via normal import resolution.
 *
 * Storybook will NOT import this file due to alias configuration.
 */

import { randomUUID } from 'node:crypto';

export type UUIDGenerator = () => string;

/**
 * Node.js implementation using node:crypto
 * Use this in Next.js server-side code
 */
export function createNodeUUIDGenerator(): UUIDGenerator {
  return randomUUID;
}

/**
 * Browser-safe implementation
 * Use this in Storybook or other browser environments
 */
export function createBrowserUUIDGenerator(): UUIDGenerator {
  return (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

/**
 * Default generator (auto-detects environment)
 * Prefers node:crypto in server context, falls back to browser implementation
 */
export function createDefaultUUIDGenerator(): UUIDGenerator {
  // In Next.js server context, use node:crypto
  try {
    return createNodeUUIDGenerator();
  } catch {
    // If node:crypto is not available, fall back to browser implementation
    return createBrowserUUIDGenerator();
  }
}
