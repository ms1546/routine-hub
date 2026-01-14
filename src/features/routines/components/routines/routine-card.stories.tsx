import type { Meta, StoryObj } from '@storybook/react';
import { RoutineCard } from './routine-card';
import { mockRoutineListItem } from '@/stories/routine-fixtures';
import { stubToggleVisibility } from '@/stories/routine-action-stubs';

const meta: Meta<typeof RoutineCard> = {
  title: 'Routines/RoutineCard',
  component: RoutineCard,
  args: {
    routine: mockRoutineListItem,
    onToggleVisibility: stubToggleVisibility
  }
};

export default meta;

type Story = StoryObj<typeof RoutineCard>;

export const PublicRoutine: Story = {};

export const PrivateRoutine: Story = {
  args: {
    routine: {
      ...mockRoutineListItem,
      visibility: 'private',
      name: 'Sabbatical Landing Gear'
    }
  }
};
