import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBDocumentClient, USER_SETTINGS_TABLE } from '@/infrastructure/db/dynamodb-client';
import {
  UserSettings,
  CreateUserSettingsInput,
  UpdateUserSettingsInput,
  userSettingsSchema
} from './models';

const clone = <T>(value: T): T => structuredClone(value);

const get = async (userId: string): Promise<UserSettings | null> => {
  try {
    const result = await dynamoDBDocumentClient.send(
      new GetCommand({
        TableName: USER_SETTINGS_TABLE,
        Key: { userId }
      })
    );

    if (!result.Item) {
      return null;
    }

    // DynamoDBのItemをUserSettingsに変換（日付文字列をDateオブジェクトに変換）
    const item = result.Item as any;
    const settings: UserSettings = {
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    };

    userSettingsSchema.parse(settings);
    return clone(settings);
  } catch (error) {
    console.error(`[userSettingsRepository.get] Error:`, error);
    throw new Error(`Failed to get user settings for ${userId}`);
  }
};

const create = async (input: CreateUserSettingsInput): Promise<UserSettings> => {
  const now = new Date();
  const settings: UserSettings = {
    userId: input.userId,
    displayName: input.displayName,
    timezone: input.timezone ?? 'Asia/Tokyo',
    requiredSleepHours: input.requiredSleepHours ?? 7,
    preferredWorkStartTime: input.preferredWorkStartTime,
    preferredWorkEndTime: input.preferredWorkEndTime,
    minBreakBetweenMinutes: input.minBreakBetweenMinutes,
    priorities: input.priorities ?? ['集中時間を守る', 'カレンダーの権威を尊重'],
    constraints: input.constraints ?? ['手動確認を好む'],
    energyLevel: input.energyLevel ?? 'medium',
    createdAt: now,
    updatedAt: now
  };

  userSettingsSchema.parse(settings);

  try {
    // DynamoDBに保存（日付をISO文字列に変換）
    const item: any = {
      ...settings,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString()
    };

    await dynamoDBDocumentClient.send(
      new PutCommand({
        TableName: USER_SETTINGS_TABLE,
        Item: item
      })
    );

    return clone(settings);
  } catch (error) {
    console.error(`[userSettingsRepository.create] Error:`, error);
    throw new Error(`Failed to create user settings for ${input.userId}`);
  }
};

const update = async (userId: string, input: UpdateUserSettingsInput): Promise<UserSettings> => {
  const current = await get(userId);
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

  try {
    // DynamoDBのUpdateExpressionを構築
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.keys(input).forEach((key) => {
      if (key === 'userId' || key === 'createdAt') {
        return; // userIdとcreatedAtは更新不可
      }
      updateExpression.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = (updated as any)[key];
    });

    // updatedAtは常に更新
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = updated.updatedAt.toISOString();

    await dynamoDBDocumentClient.send(
      new UpdateCommand({
        TableName: USER_SETTINGS_TABLE,
        Key: { userId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      })
    );

    return clone(updated);
  } catch (error) {
    console.error(`[userSettingsRepository.update] Error:`, error);
    throw new Error(`Failed to update user settings for ${userId}`);
  }
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

export const userSettingsRepositoryDynamoDB = {
  get,
  create,
  update,
  getOrCreate
};
