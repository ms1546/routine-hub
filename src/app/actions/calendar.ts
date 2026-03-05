'use server';

import { routinesRepository } from '@/features/routines';
import { buildProposedEvents } from '@/features/calendar/domain/proposals';
import { makeZonedDate } from '@/features/calendar/domain/timezone';
import { getCalendarClient } from '@/infrastructure/calendar/calendar-client-factory';
import { hasStoredRefreshToken } from '@/infrastructure/auth/oauth-boundary';
import { createDefaultCalendarWindow } from '@/features/calendar/domain/window';
import type {
  CalendarEvent,
  CalendarInsertFailure,
  RecurrencePattern,
  CalendarTimeRange,
  ProposedCalendarEvent
} from '@/features/calendar/domain/types';
import { runCalendarApplyResolutionAgent } from '@/features/ai/agents/calendar-apply-resolution-agent';

export type SkippedProposal = { proposalId: string; reason?: string };

export type CalendarConfirmationResult = {
  successCount: number;
  failureCount: number;
  insertedEvents: CalendarEvent[];
  failedEvents: CalendarInsertFailure[];
  mergedCount: number;
  mergedEvents: CalendarEvent[];
  skipped: SkippedProposal[];
};

export type GetCalendarPreviewResult =
  | { ok: true; proposedEvents: ProposedCalendarEvent[]; existingEvents: CalendarEvent[]; isCalendarConnected: boolean }
  | { ok: false; error: string };

export async function getCalendarPreviewAction({
  routineId,
  startDate,
  endDate,
  recurrence
}: {
  routineId: string;
  startDate: string;
  endDate: string;
  recurrence?: RecurrencePattern;
}): Promise<GetCalendarPreviewResult> {
  try {
    const { getCurrentUser } = await import('@/infrastructure/auth/session');
    const currentUser = await getCurrentUser();
    const routine = await routinesRepository.get(
      routineId,
      currentUser.id,
      currentUser.email,
      currentUser.role === 'admin'
    );
    if (!routine) {
      return { ok: false, error: 'Routine not found' };
    }

    const timeZone = 'Asia/Tokyo';
    const parseDateParts = (value: string) => {
      const [yearPart = '', monthPart = '', dayPart = ''] = value.split('-');
      const year = Number(yearPart);
      const month = Number(monthPart);
      const day = Number(dayPart);
      if (!yearPart || !monthPart || !dayPart || Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
        return null;
      }
      return { year, month, day };
    };

    const startParts = parseDateParts(startDate);
    const endParts = parseDateParts(endDate);
    if (!startParts || !endParts) {
      return { ok: false, error: 'Invalid date format. Expected YYYY-MM-DD.' };
    }
    const { year: startYear, month: startMonth, day: startDay } = startParts;
    const { year: endYear, month: endMonth, day: endDay } = endParts;

    const calendarWindow: CalendarTimeRange = {
      start: makeZonedDate({ year: startYear, month: startMonth, day: startDay }, timeZone).toISOString(),
      end: makeZonedDate({ year: endYear, month: endMonth, day: endDay }, timeZone).toISOString(),
      timezone: timeZone
    };

    const proposedEvents = buildProposedEvents(routine, calendarWindow, recurrence);
    const isConnected = await hasStoredRefreshToken(currentUser.email);
    const existingEvents = isConnected
      ? await getCalendarClient(currentUser.email).listEvents(calendarWindow)
      : [];

    return { ok: true, proposedEvents, existingEvents, isCalendarConnected: isConnected };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load preview';
    return { ok: false, error: message };
  }
}

/** クライアントから渡す「適用するイベント」の形（編集・AIカスタマイズ反映済み） */
export type ConfirmProposedEventsInput = {
  routineId: string;
  /** 適用するイベントの一覧。渡す場合は日付・編集・カスタマイズをそのまま挿入する。未指定の場合は proposalIds + startDate/endDate でサーバー側で再構築する。 */
  events?: ProposedCalendarEvent[];
  /** プレビュー時点で取得した既存カレンダー予定のスナップショット。渡された場合は適用時も同じスナップショットを使用する（プレビューと適用で同じ前提にするため）。 */
  existingEventsSnapshot?: CalendarEvent[];
  /** events を渡さない場合に使用。この日付範囲でサーバーが提案を再構築する。 */
  startDate?: string;
  endDate?: string;
  proposalIds: string[];
  recurrence?: RecurrencePattern;
};

/**
 * Confirm Proposed Events Action (Calendar Write)
 *
 * - events を渡した場合: その内容をそのままカレンダーに挿入（ユーザーが選んだ日付・編集・AIカスタマイズを反映）。
 * - events を渡さない場合: startDate/endDate またはデフォルト窓で buildProposedEvents し、proposalIds でフィルタして挿入。
 */
export async function confirmProposedEventsAction(
  input: ConfirmProposedEventsInput
): Promise<CalendarConfirmationResult> {
  const {
    routineId,
    events: eventsToInsert,
    existingEventsSnapshot,
    startDate,
    endDate,
    proposalIds,
    recurrence
  } = input;
  const { getCurrentUser } = await import('@/infrastructure/auth/session');
  const currentUser = await getCurrentUser();

  const routine = await routinesRepository.get(
    routineId,
    currentUser.id,
    currentUser.email,
    currentUser.role === 'admin'
  );
  if (!routine) {
    throw new Error('Routine not found');
  }

  let proposals: ProposedCalendarEvent[];

  if (eventsToInsert != null && eventsToInsert.length > 0) {
    const valid = eventsToInsert.every(
      (e) => e.routineId === routineId && proposalIds.includes(e.proposalId)
    );
    if (!valid) {
      throw new Error('Invalid events: routineId or proposalIds do not match.');
    }
    // 同一 proposalId が複数あると toInsert に重複して入りカレンダーに二重登録されるため、1件にまとめる
    proposals = [...new Map(eventsToInsert.map((e) => [e.proposalId, e])).values()];
  } else {
    const timeZone = 'Asia/Tokyo';
    let calendarWindow: CalendarTimeRange;
    if (startDate && endDate) {
      const parseDateParts = (value: string) => {
        const [yearPart = '', monthPart = '', dayPart = ''] = value.split('-');
        const year = Number(yearPart);
        const month = Number(monthPart);
        const day = Number(dayPart);
        if (!yearPart || !monthPart || !dayPart || Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
          throw new Error('Invalid date format. Expected YYYY-MM-DD.');
        }
        return { year, month, day };
      };
      const start = parseDateParts(startDate);
      const end = parseDateParts(endDate);
      calendarWindow = {
        start: makeZonedDate({ year: start.year, month: start.month, day: start.day }, timeZone).toISOString(),
        end: makeZonedDate({ year: end.year, month: end.month, day: end.day }, timeZone).toISOString(),
        timezone: timeZone
      };
    } else {
      calendarWindow = createDefaultCalendarWindow();
    }
    proposals = buildProposedEvents(routine, calendarWindow, recurrence).filter((p) =>
      proposalIds.includes(p.proposalId)
    );
  }

  const isConnected = await hasStoredRefreshToken(currentUser.email);
  if (!isConnected) {
    throw new Error('Google Calendarの接続が必要です。先に「Connect Calendar」を実行してください。');
  }
  if (proposals.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      insertedEvents: [],
      failedEvents: [],
      mergedCount: 0,
      mergedEvents: [],
      skipped: []
    };
  }
  const client = getCalendarClient(currentUser.email);
  // events を渡している場合（プレビュー経由で編集・カスタマイズ済みのケース）は、
  // プレビューと同じ existingEvents スナップショットを使い、解釈ロジックを変えずにそのまま挿入する。
  if (eventsToInsert != null && eventsToInsert.length > 0) {
    const windowFromProposals: CalendarTimeRange = {
      start: proposals.reduce(
        (min, p) => (p.start < min ? p.start : min),
        proposals[0]?.start ?? new Date().toISOString()
      ),
      end: proposals.reduce(
        (max, p) => (p.end > max ? p.end : max),
        proposals[0]?.end ?? new Date().toISOString()
      ),
      timezone: 'Asia/Tokyo'
    };
    // プレビュー時点のスナップショットがあればそれを優先し、なければ最新を取得
    const existingEvents =
      existingEventsSnapshot && existingEventsSnapshot.length > 0
        ? existingEventsSnapshot
        : await client.listEvents(windowFromProposals);

    const toInsert: ProposedCalendarEvent[] = [];
    const skipped: SkippedProposal[] = [];

    for (const prop of proposals) {
      const hasConflict = existingEvents.some((existing) => {
        const eventStart = new Date(prop.start);
        const eventEnd = new Date(prop.end);
        const existingStart = new Date(existing.start);
        const existingEnd = new Date(existing.end);
        return (
          (eventStart >= existingStart && eventStart < existingEnd) ||
          (eventEnd > existingStart && eventEnd <= existingEnd) ||
          (eventStart <= existingStart && eventEnd >= existingEnd)
        );
      });

      if (hasConflict) {
        skipped.push({
          proposalId: prop.proposalId,
          reason: '既存のカレンダー予定と重複するためスキップされました'
        });
        continue;
      }

      toInsert.push(prop);
    }

    // 同一 proposalId が複数入っているとカレンダーに二重登録されるため、1件にまとめてから挿入
    const uniqueToInsert = [...new Map(toInsert.map((e) => [e.proposalId, e])).values()];
    const result = await client.insertEvents(uniqueToInsert);
    return {
      successCount: result.success.length,
      failureCount: result.failures.length,
      insertedEvents: result.success,
      failedEvents: result.failures,
      mergedCount: 0,
      mergedEvents: [],
      skipped
    };
  }

  // events を渡さない場合は、既存ロジックどおり LLM エージェントで insert / merge / skip を決定
  const windowFromProposals: CalendarTimeRange = {
    start: proposals.reduce((min, p) => (p.start < min ? p.start : min), proposals[0]?.start ?? new Date().toISOString()),
    end: proposals.reduce((max, p) => (p.end > max ? p.end : max), proposals[0]?.end ?? new Date().toISOString()),
    timezone: 'Asia/Tokyo'
  };
  const existingEvents = await client.listEvents(windowFromProposals);
  const resolutions = await runCalendarApplyResolutionAgent({
    proposedEvents: proposals,
    existingEvents,
    routineId
  });

  const proposalsByProposalId = new Map(proposals.map((p) => [p.proposalId, p]));
  const existingById = new Map(existingEvents.map((e) => [e.id, e]));

  const toInsert: ProposedCalendarEvent[] = [];
  const skipped: SkippedProposal[] = [];
  const mergedEvents: CalendarEvent[] = [];

  for (const r of resolutions) {
    const prop = proposalsByProposalId.get(r.proposalId);
    if (!prop) continue;

    if (r.action === 'skip') {
      skipped.push({ proposalId: r.proposalId, reason: r.reason });
      continue;
    }

    if (r.action === 'merge' && r.existingEventId) {
      const existing = existingById.get(r.existingEventId);
      if (existing?.source?.routineId === routineId) {
        try {
          const updated = await client.updateEvent(r.existingEventId, {
            title: prop.title,
            description: prop.description,
            start: prop.start,
            end: prop.end
          });
          mergedEvents.push(updated);
        } catch {
          toInsert.push(prop);
        }
      } else {
        toInsert.push(prop);
      }
      continue;
    }

    if (r.action === 'insert') {
      const start = r.recommendedStart ?? prop.start;
      const end = r.recommendedEnd ?? prop.end;
      toInsert.push({ ...prop, start, end });
    }
  }

  // 同一 proposalId が複数入っているとカレンダーに二重登録されるため、1件にまとめてから挿入
  const uniqueToInsert = [...new Map(toInsert.map((e) => [e.proposalId, e])).values()];
  const result = await client.insertEvents(uniqueToInsert);
  return {
    successCount: result.success.length,
    failureCount: result.failures.length,
    insertedEvents: result.success,
    failedEvents: result.failures,
    mergedCount: mergedEvents.length,
    mergedEvents,
    skipped
  };
}
