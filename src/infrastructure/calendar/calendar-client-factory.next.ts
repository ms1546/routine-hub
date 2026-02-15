/**
 * Calendar Client Factory Next.js Implementation
 *
 * This is the Next.js-specific implementation that can use Google Calendar.
 * It is used in Next.js runtime via normal import resolution.
 *
 * Storybook will NOT import this file due to alias configuration.
 */

import type { CalendarClient } from '@/features/calendar/domain/client';
import { MockCalendarClient } from '@/features/calendar/domain/mock-client';
import { GoogleCalendarClient } from './google-calendar-client';

let overrideClient: CalendarClient | null = null;

/**
 * Get Calendar Client instance (Next.js implementation)
 *
 * Returns a CalendarClient implementation based on environment configuration.
 * - Returns GoogleCalendarClient if configured, otherwise MockCalendarClient
 */
export function getCalendarClient(userId?: string): CalendarClient {
  if (overrideClient) {
    return overrideClient;
  }

  // In server context, check configuration
  const provider = process.env.CALENDAR_CLIENT ?? 'mock';
  if (provider === 'google') {
    if (!userId) {
      throw new Error('User id is required when using Google Calendar client');
    }
    return new GoogleCalendarClient(userId);
  }

  return new MockCalendarClient();
}

/**
 * Set override client (for testing)
 */
export function setCalendarClient(client: CalendarClient | null) {
  overrideClient = client;
}
