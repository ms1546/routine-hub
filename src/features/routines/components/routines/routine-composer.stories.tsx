import type { Meta, StoryObj } from '@storybook/react';
import { RoutineComposer } from './routine-composer';
import { stubCreateRoutine } from '@/stories/routine-action-stubs';

const meta: Meta<typeof RoutineComposer> = {
  title: 'Routines/RoutineComposer',
  component: RoutineComposer,
  args: {
    action: stubCreateRoutine
  }
};

export default meta;

type Story = StoryObj<typeof RoutineComposer>;

export const Default: Story = {};
