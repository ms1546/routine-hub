'use server';

import { assertAdminUser, getCurrentUser } from '@/infrastructure/auth/session';
import { getMaintenanceState, setMaintenanceState } from '@/infrastructure/system/maintenance';

// 人間評価はLangfuse UIで行うため、アプリ側の評価機能は削除しました
// 評価はLangfuseダッシュボードのTraces画面で直接行ってください

export async function setMaintenanceModeAction(input: { enabled: boolean; message?: string }) {
  const user = await getCurrentUser();
  assertAdminUser(user);
  setMaintenanceState(input.enabled, input.message);
  return getMaintenanceState();
}
