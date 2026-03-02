'use server';

import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { UserProfileContext } from '@/features/ai/types';
import { userSettingsRepository } from '@/features/users';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { routinesRepository } from '@/features/routines';
import { runCalendarCustomizationWithTrace } from './calendar-customization-core';

const generateUUID = createDefaultUUIDGenerator();

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
  evidenceContext
}: {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  routineId?: string;
  evidenceContext?: string;
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

  const traceId = generateUUID();
  return runCalendarCustomizationWithTrace(
    {
      proposedEvents,
      existingEvents,
      userProfile,
      routinePurpose,
      evidenceContext: evidenceContext ?? undefined
    },
    traceId
  );
}
