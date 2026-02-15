import {
  UserSettings,
  CreateUserSettingsInput,
  UpdateUserSettingsInput,
  userSettingsSchema
} from './models';

const userSettingsStore = new Map<string, UserSettings>();

// Adminアカウントの初期設定
const ADMIN_EMAIL = 'routunehub.dev@gmail.com';
const initializeAdminSettings = () => {
  if (!userSettingsStore.has(ADMIN_EMAIL)) {
    const now = new Date();
    const adminSettings: UserSettings = {
      userId: ADMIN_EMAIL,
      displayName: 'admin',
      timezone: 'Asia/Tokyo',
      requiredSleepHours: 7,
      priorities: ['集中時間を守る', 'カレンダーの権威を尊重'],
      constraints: ['手動確認を好む'],
      energyLevel: 'medium',
      createdAt: now,
      updatedAt: now
    };
    userSettingsStore.set(ADMIN_EMAIL, adminSettings);
  }
};

// ストア初期化時にadmin設定を追加
initializeAdminSettings();

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

  // displayNameが必須なので、更新時にも空文字列や未定義にならないようにする
  const updated: UserSettings = {
    ...current,
    ...input,
    displayName: input.displayName !== undefined ? input.displayName : current.displayName,
    updatedAt: new Date()
  };

  // displayNameが空文字列の場合はエラー
  if (!updated.displayName || updated.displayName.trim().length === 0) {
    throw new Error('表示名は必須です');
  }

  userSettingsSchema.parse(updated);
  userSettingsStore.set(userId, updated);
  return clone(updated);
};

const getOrCreate = async (userId: string, defaults?: Partial<CreateUserSettingsInput>): Promise<UserSettings> => {
  const existing = await get(userId);
  if (existing) {
    return existing;
  }

  // displayNameが必須なので、defaultsに含まれていない場合はuserIdを表示名として使用
  const displayName = defaults?.displayName ?? userId.split('@')[0] ?? 'User';

  return await create({
    userId,
    displayName,
    timezone: defaults?.timezone ?? 'Asia/Tokyo',
    requiredSleepHours: defaults?.requiredSleepHours ?? 7,
    priorities: defaults?.priorities ?? ['集中時間を守る', 'カレンダーの権威を尊重'],
    constraints: defaults?.constraints ?? ['手動確認を好む'],
    energyLevel: defaults?.energyLevel ?? 'medium'
  });
};

export const userSettingsRepository = {
  get,
  create,
  update,
  getOrCreate
};
