'use server';

import { assertAdminUser, getCurrentUser } from '@/infrastructure/auth/session';
import { getMaintenanceState, setMaintenanceState } from '@/infrastructure/system/maintenance';

export async function setMaintenanceModeAction(input: { enabled: boolean; message?: string }) {
  const user = await getCurrentUser();
  assertAdminUser(user);
  setMaintenanceState(input.enabled, input.message);
  return getMaintenanceState();
}
