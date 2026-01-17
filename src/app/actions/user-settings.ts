'use server';

import { userSettingsRepository } from '@/features/users';
import { getCurrentUser } from '@/infrastructure/auth/session';
import type { ActionResult } from '@/shared/types/actionResult';
import type { UserSettings, UpdateUserSettingsInput } from '@/features/users';
import { z } from 'zod';

const updateUserSettingsSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  timezone: z.string().optional(),
  requiredSleepHours: z.number().int().min(4).max(12).optional(),
  priorities: z.array(z.string().min(1).max(100)).optional(),
  constraints: z.array(z.string().min(1).max(100)).optional(),
  energyLevel: z.enum(['low', 'medium', 'high']).optional()
});

export type UpdateUserSettingsPayload = z.infer<typeof updateUserSettingsSchema>;

function handleActionError<T>(error: unknown): ActionResult<T> {
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: error.issues.map((e) => e.message).join(', ')
    };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: 'Unknown error occurred' };
}

export async function updateUserSettingsAction(
  payload: UpdateUserSettingsPayload & { userId?: string }
): Promise<ActionResult<UserSettings>> {
  try {
    const user = await getCurrentUser();
    const targetUserId = payload.userId ?? user.id;
    const parsed = updateUserSettingsSchema.parse(payload);
    const updated = await userSettingsRepository.update(targetUserId, parsed);
    return { ok: true, data: updated };
  } catch (error) {
    return handleActionError<UserSettings>(error);
  }
}

export async function getUserSettingsAction(): Promise<ActionResult<UserSettings>> {
  try {
    const user = await getCurrentUser();
    const settings = await userSettingsRepository.getOrCreate(user.id, {
      displayName: user.displayName,
      timezone: 'Asia/Tokyo',
      requiredSleepHours: 7,
      priorities: ['集中時間を守る', 'カレンダーの権威を尊重'],
      constraints: ['手動確認を好む'],
      energyLevel: 'medium'
    });
    return { ok: true, data: settings };
  } catch (error) {
    return handleActionError<UserSettings>(error);
  }
}
