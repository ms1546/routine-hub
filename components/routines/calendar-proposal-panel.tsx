'use client';

import { useState, useTransition } from 'react';
import type { ProposedCalendarEvent, CalendarEvent } from '@/lib/calendar/types';
import { Button } from '@/components/ui/button';
import { confirmProposedEventsAction } from '@/app/actions/calendar';

export function CalendarProposalPanel({
  routineId,
  proposedEvents,
  existingEvents
}: {
  routineId: string;
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
}) {
  const [selectedIds, setSelectedIds] = useState(() => proposedEvents.map((event) => event.proposalId));
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleSelection = (proposalId: string) => {
    setSelectedIds((current) =>
      current.includes(proposalId)
        ? current.filter((id) => id !== proposalId)
        : [...current, proposalId]
    );
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const inserted = await confirmProposedEventsAction({
        routineId,
        proposalIds: selectedIds
      });
      setStatus(`Inserted ${inserted.length} events.`);
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/20 p-5">
      <div>
        <h4 className="text-lg font-semibold text-foreground">Proposed Calendar Events</h4>
        <p className="text-sm text-muted-foreground">
          AI suggestions require your confirmation before they are written to Google Calendar.
        </p>
      </div>

      <ul className="space-y-3">
        {proposedEvents.map((event) => (
          <li key={event.proposalId} className="flex items-start gap-3 rounded-xl border border-border/40 p-3">
            <input
              type="checkbox"
              checked={selectedIds.includes(event.proposalId)}
              onChange={() => toggleSelection(event.proposalId)}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(event.start).toLocaleString()} → {new Date(event.end).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{event.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2 rounded-xl border border-border/30 bg-card/10 p-3 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Existing events (sample)</p>
        {existingEvents.length === 0 ? (
          <p>No events in this window.</p>
        ) : (
          <ul className="list-disc pl-5">
            {existingEvents.map((event) => (
              <li key={event.id}>
                {event.title} · {new Date(event.start).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <Button
          type="button"
          variant="secondary"
          disabled={pending || selectedIds.length === 0}
          onClick={handleConfirm}
        >
          {pending ? 'Applying…' : 'Confirm and insert'}
        </Button>
        {status ? <p>{status}</p> : null}
      </div>
    </div>
  );
}
