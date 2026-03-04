import { userSettingsRepository } from '@/features/users';
import type { UserProfileContext } from '../types';

/**
 * user-settings-tool
 *
 * DynamoDB（またはメモリストア）から User Settings を取得し、
 * AI 用の UserProfileContext 形式に正規化して返す。
 */
export async function userSettingsTool(userId: string): Promise<UserProfileContext> {
  const settings = await userSettingsRepository.getOrCreate(userId, {});

  return {
    timezone: settings.timezone,
    requiredSleepHours: settings.requiredSleepHours,
    preferredWorkStartTime: settings.preferredWorkStartTime ?? undefined,
    preferredWorkEndTime: settings.preferredWorkEndTime ?? undefined,
    minBreakBetweenMinutes: settings.minBreakBetweenMinutes ?? undefined,
    priorities: settings.priorities ?? [],
    constraints: settings.constraints ?? [],
    energyLevel: settings.energyLevel ?? 'medium'
  };
}

