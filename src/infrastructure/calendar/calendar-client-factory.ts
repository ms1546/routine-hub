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
 * IMPORTANT: We use absolute path (@/infrastructure/calendar/calendar-client-factory.next) instead of
 * relative path (./calendar-client-factory.next) so that Vite alias can properly replace it.
 *
 * This approach eliminates runtime conditionals and ensures
 * proper tree-shaking and bundling for each environment.
 */

export type { CalendarClient } from '@/features/calendar/domain/client';
export { getCalendarClient, setCalendarClient } from '@/infrastructure/calendar/calendar-client-factory.next';
