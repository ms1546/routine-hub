'use client';

import { useState, useTransition } from 'react';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { confirmProposedEventsAction, type CalendarConfirmationResult } from '@/app/actions/calendar';

/**
 * カレンダー提案パネル。日付範囲や編集済みイベントを反映して適用する場合は、
 * startDate / endDate / eventsToInsert を渡すこと（未指定の場合はサーバー側のデフォルト窓で再構築される）。
 */
type AiAccessInfo = {
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  message?: string;
};

export function CalendarProposalPanel({
  routineId,
  proposedEvents,
  existingEvents,
  isCalendarConnected = true,
  connectUrl,
  initialResult,
  initialError,
  aiAccess,
  startDate,
  endDate,
  eventsToInsert
}: {
  routineId: string;
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  isCalendarConnected?: boolean;
  connectUrl?: string;
  initialResult?: CalendarConfirmationResult | null;
  initialError?: string | null;
  aiAccess?: AiAccessInfo;
  /** 適用する日付範囲（YYYY-MM-DD）。渡すとサーバーがこの範囲で提案を再構築する */
  startDate?: string;
  endDate?: string;
  /** 編集・カスタマイズ済みのイベントをそのまま挿入する場合に渡す */
  eventsToInsert?: ProposedCalendarEvent[];
}) {
  const [selectedIds, setSelectedIds] = useState(() => proposedEvents.map((event) => event.proposalId));
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<CalendarConfirmationResult | null>(initialResult ?? null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, startTransition] = useTransition();

  const toggleSelection = (proposalId: string) => {
    setSelectedIds((current) =>
      current.includes(proposalId)
        ? current.filter((id) => id !== proposalId)
        : [...current, proposalId]
    );
  };

  const handleConfirm = () => {
    if (!isCalendarConnected) {
      setError('Connect Google Calendar before inserting events.');
      return;
    }

    startTransition(async () => {
      try {
        const recurrence = proposedEvents[0]?.recurrence;
        const confirmation = await confirmProposedEventsAction({
          routineId,
          proposalIds: selectedIds,
          recurrence,
          ...(startDate && endDate ? { startDate, endDate } : {}),
          ...(eventsToInsert != null && eventsToInsert.length > 0
            ? { events: eventsToInsert, existingEventsSnapshot: existingEvents }
            : {})
        });
        setResult(confirmation);
        const parts: string[] = [];
        if (confirmation.successCount > 0) parts.push(`${confirmation.successCount} inserted`);
        if (confirmation.mergedCount > 0) parts.push(`${confirmation.mergedCount} merged`);
        if (confirmation.skipped.length > 0) parts.push(`${confirmation.skipped.length} skipped`);
        setStatus(parts.length > 0 ? parts.join(', ') + '.' : 'Done.');
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error');
      }
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h4 className="text-xl font-bold tracking-tight mb-2">Proposed Calendar Events</h4>
          {isCalendarConnected ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI suggestions require your confirmation before they are written to Google Calendar.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect Google Calendar to export proposed events.
              </p>
              {connectUrl ? (
                <a href={connectUrl}>
                  <Button type="button" variant="secondary">Connect Calendar</Button>
                </a>
              ) : null}
            </div>
          )}
        </div>

        {aiAccess ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            {aiAccess.allowed ? (
              <p className="text-sm text-muted-foreground">
                {aiAccess.remaining === null || aiAccess.limit === null
                  ? 'Admin account: unlimited AI previews.'
                  : `AI previews remaining: ${aiAccess.remaining} / ${aiAccess.limit}`}
              </p>
            ) : (
              <p className="text-sm text-destructive">{aiAccess.message ?? 'AI preview limit reached.'}</p>
            )}
          </div>
        ) : null}

        <div className="space-y-3">
          {proposedEvents.map((event) => (
            <label
              key={event.proposalId}
              className="flex items-start gap-4 rounded-lg border border-border/60 bg-card p-4 cursor-pointer transition-all duration-200 hover:border-accent/50 hover:bg-accent/5"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(event.proposalId)}
                onChange={() => toggleSelection(event.proposalId)}
                className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
              />
              <div className="flex-1 space-y-1.5">
                <p className="font-semibold text-foreground">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.start).toLocaleString()} → {new Date(event.end).toLocaleString()}
                </p>
                {event.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
          <p className="font-semibold text-sm text-foreground">Existing events (sample)</p>
          {existingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events in this window.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              {existingEvents.map((event) => (
                <li key={event.id}>
                  {event.title} · {new Date(event.start).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4 pt-2">
          <Button
            type="button"
            variant="default"
            disabled={pending || selectedIds.length === 0}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {pending ? 'Applying…' : 'Confirm and insert'}
          </Button>
          {status && <p className="text-sm text-muted-foreground">{status}</p>}
          {result && (
            <div className="rounded-lg border border-border/60 bg-card p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Successful: {result.successCount} · Failed: {result.failureCount}
              </p>
              {result.failedEvents.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {result.failedEvents.map((failure) => (
                    <li key={failure.proposalId}>{failure.reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
