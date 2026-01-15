import type { Meta, StoryObj } from '@storybook/react';
import { ForkRoutineForm } from '@/features/routines/components/routines/fork-routine-form';
import { stubForkRoutine } from '../../../../routine-action-stubs';

const meta: Meta<typeof ForkRoutineForm> = {
  title: 'Routines/ForkRoutineForm',
  component: ForkRoutineForm,
  args: {
    routineId: 'story-routine',
    defaultName: 'Deep Focus Reset',
    action: stubForkRoutine
  }
};

export default meta;

type Story = StoryObj<typeof ForkRoutineForm>;

export const Default: Story = {};
