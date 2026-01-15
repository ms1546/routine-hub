import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@/shared/ui/badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  args: {
    children: 'Focus',
    variant: 'default'
  }
};

export default meta;

type Story = StoryObj<typeof Badge>;

export const Default: Story = {};
export const Outline: Story = {
  args: {
    variant: 'outline'
  }
};
