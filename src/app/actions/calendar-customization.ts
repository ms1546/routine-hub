'use server';

import { randomUUID } from 'node:crypto';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { UserProfileContext } from '@/features/ai/types';
import { userSettingsRepository } from '@/features/users';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { mastraRepository } from '@/features/ai/mastra/repository';
import { routinesRepository } from '@/features/routines';

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
  routineId
}: {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  routineId?: string;
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
    priorities: settings.priorities,
    constraints: settings.constraints,
    energyLevel: settings.energyLevel
  };

  // Routine情報を取得（目的を参照するため）
  let routinePurpose: string | undefined;
  if (routineId) {
    try {
      const routine = await routinesRepository.get(routineId, currentUser.id);
      routinePurpose = routine?.purpose;
    } catch (error) {
      console.warn('[CalendarCustomization] Failed to fetch routine:', error);
    }
  }

  try {
    const workflow = mastraRepository.getWorkflows().calendarCustomizationWorkflow;
    if (!workflow) {
      throw new Error('Calendar customization workflow is not registered in Mastra repository');
    }

    const run = await workflow.createRunAsync();
    const traceId = randomUUID();
    const runResult = await run.start({
      inputData: {
        proposedEvents,
        existingEvents,
        userProfile,
        routinePurpose // Routineの目的を追加
      },
      tracingOptions: { traceId }
    });

    if (runResult.status !== 'success' || !runResult.result) {
      throw new Error('Calendar customization workflow execution failed');
    }

    return runResult.result;
  } catch (error) {
    console.error('[CalendarCustomization] Workflow execution failed:', error);
    // フォールバック: カスタマイズなしで元のイベントを返す
    return {
      customizedEvents: proposedEvents.map((event) => ({
        proposalId: event.proposalId,
        reasoning: 'カスタマイズWorkflowの実行に失敗しました。元のイベントをそのまま使用します。'
      })),
      suggestions: []
    };
  }
}
