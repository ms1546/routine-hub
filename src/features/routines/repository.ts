// Repository export (server-only, contains node:crypto dependency)
// This file should NOT be imported by UI components
// Use this only in Server Actions, API routes, or Container components

import { createRoutinesRepository } from './domain/store';
import { createNodeUUIDGenerator } from '@/shared/utils/uuid';

// Initialize repository with Node.js UUID generator
// This is safe because this file is only imported in server-side code
const nodeUUIDGenerator = createNodeUUIDGenerator();
const initializedRepository = createRoutinesRepository(nodeUUIDGenerator);

// Export the initialized repository
// This maintains backward compatibility with existing imports
export const routinesRepository = initializedRepository;

// Also export the factory function for testing or custom initialization
export { createRoutinesRepository };
