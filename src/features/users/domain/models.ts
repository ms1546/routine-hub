import { z } from 'zod';

/** HH:mm 形式（00:00〜23:59） */
const timeStringSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/);

export const userSettingsSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).max(80), // 必須
  timezone: z.string().default('Asia/Tokyo'),
  requiredSleepHours: z.number().int().min(4).max(12).default(7),
  /** イベントを入れたい最早時刻（これより前は避ける）。AIカスタマイズで使用 */
  preferredWorkStartTime: timeStringSchema.optional(),
  /** イベントを入れたい最遅時刻（これより後は避ける）。AIカスタマイズで使用 */
  preferredWorkEndTime: timeStringSchema.optional(),
  /** 連続イベント間の最小休憩（分）。AIカスタマイズで使用 */
  minBreakBetweenMinutes: z.number().int().min(5).max(30).optional(),
  priorities: z.array(z.string().min(1).max(100)).default(['集中時間を守る', 'カレンダーの権威を尊重']),
  constraints: z.array(z.string().min(1).max(100)).default(['手動確認を好む']),
  energyLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

export type CreateUserSettingsInput = Omit<UserSettings, 'userId' | 'createdAt' | 'updatedAt'> & {
  userId: string;
};

export type UpdateUserSettingsInput = Partial<Omit<UserSettings, 'userId' | 'createdAt' | 'updatedAt'>>;
