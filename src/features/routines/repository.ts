// Repository export (server-only, contains node:crypto dependency)
// This file should NOT be imported by UI components
// Use this only in Server Actions, API routes, or Container components

import { createRoutinesRepository } from './domain/store';
import { routinesRepositoryDynamoDB } from './domain/dynamodb-store';
import { createNodeUUIDGenerator } from '@/shared/utils/uuid';

const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  typeof (globalThis as { vi?: unknown }).vi !== 'undefined';

const routinesStoreMode =
  process.env.ROUTINES_STORE ?? (process.env.NODE_ENV === 'production' ? 'dynamodb' : 'memory');

// Initialize repository with Node.js UUID generator
// This is safe because this file is only imported in server-side code
const nodeUUIDGenerator = createNodeUUIDGenerator();
const inMemoryRepository = createRoutinesRepository(nodeUUIDGenerator);

// Export the initialized repository
// This maintains backward compatibility with existing imports
export const routinesRepository =
  !isTestEnvironment && routinesStoreMode === 'dynamodb'
    ? routinesRepositoryDynamoDB
    : inMemoryRepository;

// Also export the factory function for testing or custom initialization
export { createRoutinesRepository };
