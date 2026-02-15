// Public API for routines feature (browser-safe)
// This file exports types and presenters (browser-safe)
// For repository access, import from './repository.browser' instead
export * from './domain/models';
export * from './domain/presenters';

// Re-export repository for backward compatibility (browser-safe version)
// This uses repository.browser.ts which uses createDefaultUUIDGenerator
export { routinesRepository } from './repository.browser';
