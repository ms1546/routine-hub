import type { Meta, StoryObj } from '@storybook/react';
import { CalendarProposalPanel } from '@/features/routines/components/routines/calendar-proposal-panel';
import { mockProposedEvents, mockExistingEvents } from '../../../../routine-fixtures';

const meta: Meta<typeof CalendarProposalPanel> = {
  title: 'Routines/CalendarProposalPanel',
  component: CalendarProposalPanel,
  args: {
    routineId: 'story-routine',
    proposedEvents: mockProposedEvents,
    existingEvents: mockExistingEvents,
    isCalendarConnected: true,
    aiAccess: {
      allowed: true,
      remaining: 1,
      limit: 1
    }
  }
};

export default meta;

type Story = StoryObj<typeof CalendarProposalPanel>;

export const Default: Story = {};

export const PartialSuccess: Story = {
  args: {
    initialResult: {
      successCount: 1,
      failureCount: 1,
      insertedEvents: [],
      failedEvents: [{ proposalId: 'mock-2', reason: 'Conflict detected' }]
    }
  }
};

export const OAuthNotConnected: Story = {
  args: {
    isCalendarConnected: false
  }
};

export const PermissionError: Story = {
  args: {
    initialError: 'Google Calendar permission denied'
  }
};

export const AiLimitReached: Story = {
  args: {
    aiAccess: {
      allowed: false,
      remaining: 0,
      limit: 1,
      message: 'Trial accounts can run AI once per week.'
    }
  }
};
