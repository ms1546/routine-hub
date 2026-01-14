import type { Meta, StoryObj } from '@storybook/react';
import { ExecutionHistoryCard } from './execution-history-card';
import { HumanEvaluationForm } from './human-evaluation-form';
import { MaintenanceCard } from './maintenance-card';
import type { ExecutionRecord } from '@/features/ai/execution-log';
import type { MaintenanceState } from '@/infrastructure/system/maintenance';

const mockRecords: ExecutionRecord[] = [
  {
    id: 'exec-1',
    workflowName: 'routine-ai-workflow',
    routineId: 'routine-1',
    routineName: 'Deep Focus Reset',
    triggeredBy: 'Ops Team',
    triggeredByEmail: 'ops@routinehub.dev',
    status: 'success',
    executedAt: new Date().toISOString(),
    judgeScore: 4.3,
    judgeVerdict: 'approve',
    hasHumanEvaluation: true,
    humanEvaluations: [
      {
        id: 'evaluation-1',
        executionId: 'exec-1',
        reviewerId: 'account-ops',
        reviewerName: 'Ops Team',
        score: 4,
        comment: 'Aligned with design brief.',
        createdAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'exec-2',
    workflowName: 'routine-ai-workflow',
    routineId: 'routine-2',
    routineName: 'Product Lead Syncopation',
    triggeredBy: 'Ops Team',
    triggeredByEmail: 'ops@routinehub.dev',
    status: 'success',
    executedAt: new Date(Date.now() - 3600_000).toISOString(),
    judgeScore: 3.1,
    judgeVerdict: 'revise',
    hasHumanEvaluation: false,
    humanEvaluations: []
  }
];

const meta = {
  title: 'Admin/AdminPanels',
  component: ExecutionHistoryCard
} satisfies Meta<typeof ExecutionHistoryCard>;

export default meta;

export const HistoryCard: StoryObj = {
  render: () => <ExecutionHistoryCard records={mockRecords} />
};

export const EvaluationForm: StoryObj = {
  render: () => (
    <HumanEvaluationForm
      executions={mockRecords.map((record) => ({
        id: record.id,
        label: `${record.workflowName} · ${record.routineName}`,
        hasHumanEvaluation: record.hasHumanEvaluation
      }))}
      action={async () => ({})}
    />
  )
};

const maintenanceState: MaintenanceState = {
  enabled: true,
  message: 'Deploying Langfuse instrumentation. Back soon.',
  updatedAt: new Date().toISOString()
};

export const MaintenancePanel: StoryObj = {
  render: () => <MaintenanceCard state={maintenanceState} action={async () => maintenanceState} />
};
