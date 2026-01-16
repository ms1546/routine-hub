export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO string
  end: string; // ISO string
  source?: {
    routineId?: string;
    blockId?: string;
    proposalId?: string;
  };
};

export type RecurrencePattern =
  | { type: 'none' }
  | { type: 'weekly'; interval?: number } // interval=1は毎週、interval=2は隔週
  | { type: 'monthly'; interval?: number }; // interval=1は毎月

export type ProposedCalendarEvent = {
  proposalId: string;
  routineId: string;
  blockId: string;
  title: string;
  description: string;
  start: string;
  end: string;
  status: 'pending' | 'confirmed';
  recurrence?: RecurrencePattern;
};

export type CalendarTimeRange = {
  start: string;
  end: string;
  timezone: string;
};

export type CalendarInsertFailure = {
  proposalId: string;
  reason: string;
};

export type CalendarInsertResult = {
  success: CalendarEvent[];
  failures: CalendarInsertFailure[];
};
