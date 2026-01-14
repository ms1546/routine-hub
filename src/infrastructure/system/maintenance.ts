export type MaintenanceState = {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
};

let maintenanceState: MaintenanceState = {
  enabled: false,
  message: '',
  updatedAt: null
};

export function getMaintenanceState(): MaintenanceState {
  return { ...maintenanceState };
}

export function setMaintenanceState(enabled: boolean, message?: string): MaintenanceState {
  maintenanceState = {
    enabled,
    message: enabled ? message ?? 'Routine Hub is currently in maintenance mode.' : '',
    updatedAt: new Date().toISOString()
  };
  return getMaintenanceState();
}
