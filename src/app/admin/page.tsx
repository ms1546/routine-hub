import { notFound } from 'next/navigation';
import { AppShell } from '@/shared/components/app-shell';
import { getCurrentUser, isAdminUser } from '@/infrastructure/auth/session';
import { getExecutionRecords } from '@/features/ai/execution-log';
import { ExecutionHistoryCard } from '@/features/admin/components/admin/execution-history-card';
import { HumanEvaluationForm } from '@/features/admin/components/admin/human-evaluation-form';
import { MaintenanceCard } from '@/features/admin/components/admin/maintenance-card';
import { addHumanEvaluationAction, setMaintenanceModeAction } from '@/features/admin/actions/admin';
import { getMaintenanceState } from '@/infrastructure/system/maintenance';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    notFound();
  }

  const records = getExecutionRecords(25);
  const maintenance = getMaintenanceState();

  return (
    <AppShell
      title="管理コンソール"
    >
      <ExecutionHistoryCard records={records} />
      <HumanEvaluationForm
        executions={records.map((record) => ({
          id: record.id,
          label: `${record.workflowName} · ${record.routineName}`,
          hasHumanEvaluation: record.hasHumanEvaluation
        }))}
        action={addHumanEvaluationAction}
      />
      <MaintenanceCard state={maintenance} action={setMaintenanceModeAction} />
    </AppShell>
  );
}
