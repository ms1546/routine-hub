import type { Meta, StoryObj } from '@storybook/react';
import { RoutineFilters } from '@/features/routines/components/routine-filters';

const meta: Meta<typeof RoutineFilters> = {
  title: 'Routines/RoutineFilters',
  component: RoutineFilters,
  args: {
    availableTags: ['focus', 'reset', 'leadership']
  }
};

export default meta;

type Story = StoryObj<typeof RoutineFilters>;

export const Default: Story = {};
