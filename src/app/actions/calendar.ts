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

export type CalendarConfirmationResult = {
  successCount: number;
  failureCount: number;
  insertedEvents: CalendarEvent[];
  failedEvents: CalendarInsertFailure[];
};

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
}): Promise<{ proposedEvents: ProposedCalendarEvent[]; existingEvents: CalendarEvent[]; isCalendarConnected: boolean }> {
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

  const timeZone = 'Asia/Tokyo';
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

  const { year: startYear, month: startMonth, day: startDay } = parseDateParts(startDate);
  const { year: endYear, month: endMonth, day: endDay } = parseDateParts(endDate);

  const calendarWindow: CalendarTimeRange = {
    start: makeZonedDate({ year: startYear, month: startMonth, day: startDay }, timeZone).toISOString(),
    end: makeZonedDate({ year: endYear, month: endMonth, day: endDay }, timeZone).toISOString(),
    timezone: timeZone
  };

  const proposedEvents = buildProposedEvents(routine, calendarWindow, recurrence);
  // ログイン中ユーザーのカレンダー接続状態を使用（routine.owner ではない）
  const isConnected = await hasStoredRefreshToken(currentUser.email);
  const existingEvents = isConnected
    ? await getCalendarClient(currentUser.email).listEvents(calendarWindow)
    : [];

  return { proposedEvents, existingEvents, isCalendarConnected: isConnected };
}

/** クライアントから渡す「適用するイベント」の形（編集・AIカスタマイズ反映済み） */
export type ConfirmProposedEventsInput = {
  routineId: string;
  /** 適用するイベントの一覧。渡す場合は日付・編集・カスタマイズをそのまま挿入する。未指定の場合は proposalIds + startDate/endDate でサーバー側で再構築する。 */
  events?: ProposedCalendarEvent[];
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
  const { routineId, events: eventsToInsert, startDate, endDate, proposalIds, recurrence } = input;
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
    proposals = eventsToInsert;
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

  // ログイン中ユーザーのカレンダーに挿入するため、currentUser の接続状態を使用
  const isConnected = await hasStoredRefreshToken(currentUser.email);
  if (!isConnected) {
    throw new Error('Google Calendarの接続が必要です。先に「Connect Calendar」を実行してください。');
  }
  const client = getCalendarClient(currentUser.email);
  const result = await client.insertEvents(proposals);
  return {
    successCount: result.success.length,
    failureCount: result.failures.length,
    insertedEvents: result.success,
    failedEvents: result.failures
  };
}
