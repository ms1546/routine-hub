/**
 * UUID Generator Browser Implementation
 *
 * This is the browser-safe implementation for Storybook.
 * It is used in Storybook via alias configuration.
 *
 * Next.js will NOT import this file due to normal import resolution.
 */

export type UUIDGenerator = () => string;

/**
 * Node.js implementation (not available in browser)
 * This should never be called in browser context
 */
export function createNodeUUIDGenerator(): UUIDGenerator {
  throw new Error('createNodeUUIDGenerator() is not available in browser context. Use createBrowserUUIDGenerator() instead.');
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
