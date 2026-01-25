import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CloneRoutineForm } from '@/features/routines/components/clone-routine-form';
import { stubCloneRoutine } from '../../../../routine-action-stubs';

const meta: Meta<typeof CloneRoutineForm> = {
  title: 'Routines/CloneRoutineForm',
  component: CloneRoutineForm,
  args: {
    routineId: 'story-routine',
    defaultName: 'Deep Focus Reset',
    action: stubCloneRoutine
  }
};

export default meta;

type Story = StoryObj<typeof CloneRoutineForm>;

export const Default: Story = {};
