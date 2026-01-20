/**
 * Calendar Client Factory (Public API)
 *
 * Clean Architecture: Domain layer should not depend on googleapis directly.
 * This abstraction allows dependency injection of calendar clients.
 *
 * This file is the public API. The actual implementation is selected
 * via module resolution (alias) at build time:
 * - Next.js: resolves to calendar-client-factory.next.ts (normal import resolution)
 * - Storybook: resolves to calendar-client-factory.browser.ts (via vite alias)
 *
 * This approach eliminates runtime conditionals and ensures
 * proper tree-shaking and bundling for each environment.
 */

export type { CalendarClient } from '@/features/calendar/domain/client';
export { getCalendarClient, setCalendarClient } from './calendar-client-factory.next';
