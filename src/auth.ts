/**
 * Auth Module Re-export (Server-only)
 *
 * This file re-exports NextAuth configuration from infrastructure layer.
 * It exists for backward compatibility with existing imports.
 *
 * IMPORTANT: This file should ONLY be imported in server contexts
 * (Server Actions, API Routes, Server Components).
 *
 * For browser contexts (Storybook, client components), use:
 * - next-auth/react for client-side auth hooks
 * - Infrastructure layer provides browser-safe implementations
 */

// Re-export from infrastructure layer
// This ensures next-auth is only loaded in server contexts
export { handlers, signIn, signOut, auth } from './infrastructure/auth/next-auth-config';
