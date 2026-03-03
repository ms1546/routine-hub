'use server';

import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { UserProfileContext } from '@/features/ai/types';
import type { RoutineBlockAdjustment } from '@/features/ai/routine-adjustment/types';
import { userSettingsRepository } from '@/features/users';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { routinesRepository } from '@/features/routines';
import { runCalendarCustomizationWithTrace } from './calendar-customization-core';

const generateUUID = createDefaultUUIDGenerator();

/** 指定タイムゾーンでの日付（y,m,d）と時刻（時.分）から ISO 文字列を生成する */
function toISOAtLocalHour(
  year: number,
  month: number,
  day: number,
  hourDecimal: number,
  timezone: string
): string {
  const h = Math.floor(hourDecimal);
  const m = Math.round((hourDecimal - h) * 60);
  const utcNoon = Date.UTC(year, month - 1, day, 12, 0);
  const inTz = new Date(utcNoon).toLocaleString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
    minute: '2-digit'
  });
  const parts = inTz.split(':').map((s) => parseInt(s.trim(), 10));
  const tzHour = parts[0] !== undefined && !Number.isNaN(parts[0]) ? parts[0] : 12;
  const tzMin = parts[1] !== undefined && !Number.isNaN(parts[1]) ? parts[1] : 0;
  const offsetHours = tzHour - 12 + tzMin / 60;
  const utcMs = Date.UTC(year, month - 1, day, h, m) - offsetHours * 3600 * 1000;
  return new Date(utcMs).toISOString();
}

/** イベントの start からユーザー TZ でのカレンダー日付 (y, m, d) を取得 */
function getDatePartsInTimezone(isoStart: string, timezone: string): { year: number; month: number; day: number } {
  const d = new Date(isoStart);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(d);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1);
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? 1);
  return { year, month, day };
}

/** 文献・調整案（blockAdjustments）を提案イベントに適用し、start/end を更新する */
function applyBlockAdjustmentsToProposed(
  proposedEvents: ProposedCalendarEvent[],
  blockAdjustments: RoutineBlockAdjustment[],
  timezone: string
): ProposedCalendarEvent[] {
  const byBlockId = new Map(blockAdjustments.map((a) => [a.blockId, a]));
  if (byBlockId.size === 0) return proposedEvents;

  return proposedEvents.map((event) => {
    const adj = byBlockId.get(event.blockId);
    if (!adj || (adj.startHour == null && adj.endHour == null)) return event;

    const { year, month, day } = getDatePartsInTimezone(event.start, timezone);
    let start = event.start;
    let end = event.end;
    if (adj.startHour != null && !Number.isNaN(adj.startHour)) {
      start = toISOAtLocalHour(year, month, day, adj.startHour, timezone);
    }
    if (adj.endHour != null && !Number.isNaN(adj.endHour)) {
      end = toISOAtLocalHour(year, month, day, adj.endHour, timezone);
    }
    if (start === event.start && end === event.end) return event;
    return { ...event, start, end };
  });
}

export type CalendarCustomizationResult = {
  customizedEvents: Array<{
    proposalId: string;
    title?: string;
    description?: string;
    start?: string;
    end?: string;
    reasoning: string;
  }>;
  suggestions: Array<{
    type: 'time-adjustment' | 'energy-optimization' | 'conflict-resolution';
    description: string;
    affectedProposalIds: string[];
  }>;
};

export async function customizeCalendarEventsAction({
  proposedEvents,
  existingEvents,
  routineId,
  /** 文献に基づくアドバイス。渡すとカスタマイズの判断に参照される */
  evidenceContext,
  /** 文献・設定に基づくブロック調整案。渡すと提案イベントの start/end に先に反映してからカスタマイズする */
  blockAdjustments
}: {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  routineId?: string;
  evidenceContext?: string;
  blockAdjustments?: RoutineBlockAdjustment[];
}): Promise<CalendarCustomizationResult> {
  const currentUser = await getCurrentUser();

  // ユーザー設定を取得（なければデフォルト値で作成）
  const settings = await userSettingsRepository.getOrCreate(currentUser.id, {
    displayName: currentUser.displayName,
    timezone: 'Asia/Tokyo',
    requiredSleepHours: 7,
    priorities: ['集中時間を守る', 'カレンダーの権威を尊重'],
    constraints: ['手動確認を好む'],
    energyLevel: 'medium'
  });

  const userProfile: UserProfileContext = {
    timezone: settings.timezone,
    requiredSleepHours: settings.requiredSleepHours,
    preferredWorkStartTime: settings.preferredWorkStartTime,
    preferredWorkEndTime: settings.preferredWorkEndTime,
    minBreakBetweenMinutes: settings.minBreakBetweenMinutes,
    priorities: settings.priorities,
    constraints: settings.constraints,
    energyLevel: settings.energyLevel
  };

  // Routine情報を取得（目的を参照するため）
  let routinePurpose: string | undefined;
  if (routineId) {
    try {
      const routine = await routinesRepository.get(
        routineId,
        currentUser.id,
        currentUser.email,
        currentUser.role === 'admin'
      );
      routinePurpose = routine?.purpose;
    } catch (error) {
      console.warn('[CalendarCustomization] Failed to fetch routine:', error);
    }
  }

  // 文献・調整案でブロックの時間を先に反映（2時間→90分など）。その上で競合解消などのカスタマイズを行う
  const eventsToCustomize =
    blockAdjustments && blockAdjustments.length > 0
      ? applyBlockAdjustmentsToProposed(proposedEvents, blockAdjustments, userProfile.timezone)
      : proposedEvents;

  const traceId = generateUUID();
  return runCalendarCustomizationWithTrace(
    {
      proposedEvents: eventsToCustomize,
      existingEvents,
      userProfile,
      routinePurpose,
      evidenceContext: evidenceContext ?? undefined
    },
    traceId
  );
}
