import type { Meta, StoryObj } from '@storybook/react';
import { RoutineDetail } from './routine-detail';
import { mockRoutineDetail } from '@/stories/routine-fixtures';
import { stubApplyRoutine, stubForkRoutine, stubToggleVisibility } from '@/stories/routine-action-stubs';

const insights = [
  { title: 'Load & Recovery Balance', body: 'Preview text for guardrail messaging.', severity: 'info' as const },
  { title: 'Conflict Watchlist', body: 'Conflicts require user confirmation.', severity: 'warning' as const }
];

const meta: Meta<typeof RoutineDetail> = {
  title: 'Routines/RoutineDetail',
  component: RoutineDetail,
  args: {
    routine: mockRoutineDetail,
    insights,
    onToggleVisibility: stubToggleVisibility,
    onApplyRoutine: stubApplyRoutine,
    onForkRoutine: stubForkRoutine
  }
};

export default meta;

type Story = StoryObj<typeof RoutineDetail>;

export const Overview: Story = {};
