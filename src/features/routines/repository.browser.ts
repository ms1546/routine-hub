// Repository export (browser-safe, uses browser-compatible UUID generator)
// This file is used in Storybook and other browser environments
// It uses createDefaultUUIDGenerator which automatically selects the browser implementation

import { createRoutinesRepository } from './domain/store';
import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';

// Initialize repository with browser-safe UUID generator
// createDefaultUUIDGenerator will use createBrowserUUIDGenerator in browser context
const browserUUIDGenerator = createDefaultUUIDGenerator();
const initializedRepository = createRoutinesRepository(browserUUIDGenerator);

// Export the initialized repository
// This maintains backward compatibility with existing imports
export const routinesRepository = initializedRepository;

// Also export the factory function for testing or custom initialization
export { createRoutinesRepository };
