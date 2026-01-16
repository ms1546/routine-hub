import { randomUUID } from 'node:crypto';
import {
  UserSettings,
  CreateUserSettingsInput,
  UpdateUserSettingsInput,
  userSettingsSchema
} from './models';

const userSettingsStore = new Map<string, UserSettings>();

const clone = <T>(value: T): T => structuredClone(value);

const get = async (userId: string): Promise<UserSettings | null> => {
  const settings = userSettingsStore.get(userId);
  return settings ? clone(settings) : null;
};

const create = async (input: CreateUserSettingsInput): Promise<UserSettings> => {
  const now = new Date();
  const settings: UserSettings = {
    userId: input.userId,
    displayName: input.displayName,
    timezone: input.timezone ?? 'Asia/Tokyo',
    requiredSleepHours: input.requiredSleepHours ?? 7,
    priorities: input.priorities ?? ['集中時間を守る', 'カレンダーの権威を尊重'],
    constraints: input.constraints ?? ['手動確認を好む'],
    energyLevel: input.energyLevel ?? 'medium',
    createdAt: now,
    updatedAt: now
  };

  userSettingsSchema.parse(settings);
  userSettingsStore.set(settings.userId, settings);
  return clone(settings);
};

const update = async (userId: string, input: UpdateUserSettingsInput): Promise<UserSettings> => {
  const current = userSettingsStore.get(userId);
  if (!current) {
    throw new Error(`User settings not found for user ${userId}`);
  }

  const updated: UserSettings = {
    ...current,
    ...input,
    updatedAt: new Date()
  };

  userSettingsSchema.parse(updated);
  userSettingsStore.set(userId, updated);
  return clone(updated);
};

const getOrCreate = async (userId: string, defaults?: Partial<CreateUserSettingsInput>): Promise<UserSettings> => {
  const existing = await get(userId);
  if (existing) {
    return existing;
  }

  return await create({
    userId,
    ...defaults
  });
};

export const userSettingsRepository = {
  get,
  create,
  update,
  getOrCreate
};
