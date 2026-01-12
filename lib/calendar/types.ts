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

export type ProposedCalendarEvent = {
  proposalId: string;
  routineId: string;
  blockId: string;
  title: string;
  description: string;
  start: string;
  end: string;
  status: 'pending' | 'confirmed';
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
