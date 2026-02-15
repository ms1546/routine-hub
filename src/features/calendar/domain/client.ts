/**
 * Calendar Client Interface (Domain Layer)
 *
 * This file defines the CalendarClient interface that domain logic depends on.
 * It does NOT import any Node.js-specific implementations (googleapis).
 *
 * Clean Architecture: Domain layer only knows about interfaces, not implementations.
 * Implementations are provided by infrastructure layer via dependency injection.
 */

import type {
  CalendarEvent,
  CalendarTimeRange,
  ProposedCalendarEvent,
  CalendarInsertResult
} from './types';

/**
 * Calendar Client Interface
 *
 * Domain layer depends on this interface, not concrete implementations.
 * Implementations are provided by infrastructure layer.
 */
export interface CalendarClient {
  listEvents(range: CalendarTimeRange): Promise<CalendarEvent[]>;
  insertEvents(events: ProposedCalendarEvent[]): Promise<CalendarInsertResult>;
}

// Note: getCalendarClient() and setCalendarClient() are now in infrastructure layer
// Import from '@/infrastructure/calendar/calendar-client-factory' if you need them
