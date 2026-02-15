/**
 * UUID Generator (Public API) - Browser Version
 *
 * This is the browser-safe version used in Storybook.
 * It exports the same API as uuid.ts but uses browser-safe implementations.
 */

export type UUIDGenerator = () => string;

/**
 * Node.js implementation (not available in browser)
 * This should never be called in browser context
 */
export function createNodeUUIDGenerator(): UUIDGenerator {
  // In Storybook we always run in the browser, so return a browser-safe generator.
  return createBrowserUUIDGenerator();
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
 * Default generator (browser implementation)
 * Always uses browser-safe implementation
 */
export function createDefaultUUIDGenerator(): UUIDGenerator {
  return createBrowserUUIDGenerator();
}
