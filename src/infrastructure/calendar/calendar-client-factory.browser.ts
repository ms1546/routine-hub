/**
 * Calendar Client Factory Browser Implementation
 *
 * This is the browser-safe implementation for Storybook.
 * It is used in Storybook via alias configuration.
 *
 * Next.js will NOT import this file due to normal import resolution.
 */

import type { CalendarClient } from '@/features/calendar/domain/client';
import { MockCalendarClient } from '@/features/calendar/domain/mock-client';

let overrideClient: CalendarClient | null = null;

/**
 * Get Calendar Client instance (browser implementation)
 *
 * In Storybook, always returns MockCalendarClient.
 * This prevents googleapis from being imported in browser builds.
 */
export function getCalendarClient(_userId?: string): CalendarClient {
  if (overrideClient) {
    return overrideClient;
  }

  // In browser context, always use mock client
  return new MockCalendarClient();
}

/**
 * Set override client (for testing)
 */
export function setCalendarClient(client: CalendarClient | null) {
  overrideClient = client;
}
