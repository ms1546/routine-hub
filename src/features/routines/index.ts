// Public API for routines feature
// This file exports types and presenters (browser-safe)
// For repository access, import from './repository' instead
export * from './domain/models';
export * from './domain/presenters';

// Re-export repository for backward compatibility
// Note: This will import node:crypto when repository is actually used
// UI components should use 'import type' to avoid importing this
export { routinesRepository } from './repository';
