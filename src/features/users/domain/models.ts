import { z } from 'zod';

export const userSettingsSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).max(80), // 必須
  timezone: z.string().default('Asia/Tokyo'),
  requiredSleepHours: z.number().int().min(4).max(12).default(7),
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
