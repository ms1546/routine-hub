/**
 * User settings のリポジトリを環境に応じて切り替える。
 * 本番では DynamoDB（routune-hub-production-user-settings 等）に保存し、
 * テスト・未設定時はメモリストアを使用する。
 */

import { userSettingsRepository as userSettingsRepositoryMemory } from './domain/store';
import { userSettingsRepositoryDynamoDB } from './domain/dynamodb-store';

const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  typeof (globalThis as { vi?: unknown }).vi !== 'undefined';

const userSettingsStoreMode =
  process.env.USER_SETTINGS_STORE ??
  (process.env.NODE_ENV === 'production' ? 'dynamodb' : 'memory');

export const userSettingsRepository =
  !isTestEnvironment && userSettingsStoreMode === 'dynamodb'
    ? userSettingsRepositoryDynamoDB
    : userSettingsRepositoryMemory;
