import type { Meta, StoryObj } from '@storybook/react';
import { ApplyRoutineForm } from '@/features/routines/components/apply-routine-form';
import { stubApplyRoutine } from '../../../../routine-action-stubs';

const meta: Meta<typeof ApplyRoutineForm> = {
  title: 'Routines/ApplyRoutineForm',
  component: ApplyRoutineForm,
  args: {
    routineId: 'story-routine',
    durationType: 'weekly',
    action: stubApplyRoutine
  }
};

export default meta;

type Story = StoryObj<typeof ApplyRoutineForm>;

export const Default: Story = {};
