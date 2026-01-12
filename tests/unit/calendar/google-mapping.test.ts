import { describe, it, expect } from 'vitest';
import { mapGoogleEvent } from '@/lib/calendar/google-client';
import fixture from '@/tests/fixtures/google-event.json';
import type { calendar_v3 } from 'googleapis';

describe('mapGoogleEvent', () => {
  it('converts Google Calendar event JSON into internal CalendarEvent', () => {
    const event = fixture as calendar_v3.Schema$Event;
    const mapped = mapGoogleEvent(event);
    expect(mapped.id).toBe('event-123');
    expect(mapped.title).toBe('集中ブロック');
    expect(mapped.source?.proposalId).toBe('proposal-1');
  });
});
