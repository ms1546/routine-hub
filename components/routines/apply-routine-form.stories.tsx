import type { Meta, StoryObj } from '@storybook/react';
import { ApplyRoutineForm } from './apply-routine-form';
import { stubApplyRoutine } from '@/stories/routine-action-stubs';

const meta: Meta<typeof ApplyRoutineForm> = {
  title: 'Routines/ApplyRoutineForm',
  component: ApplyRoutineForm,
  args: {
    routineId: 'story-routine',
    action: stubApplyRoutine
  }
};

export default meta;

type Story = StoryObj<typeof ApplyRoutineForm>;

export const Default: Story = {};
