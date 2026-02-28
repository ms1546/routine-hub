import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { UserSettingsForm } from '@/features/users/components/user-settings-form';
import type { UserSettings } from '@/features/users';
import type { ActionResult } from '@/shared/types/actionResult';
import type { UpdateUserSettingsPayload } from '@/app/actions/user-settings';

const baseSettings: UserSettings = {
  userId: 'story-user@example.com',
  displayName: 'Story User',
  timezone: 'Asia/Tokyo',
  requiredSleepHours: 7,
  priorities: ['集中時間を守る', 'カレンダーの権威を尊重'],
  constraints: ['手動確認を好む'],
  energyLevel: 'medium',
  createdAt: new Date(),
  updatedAt: new Date()
};

const stubUpdateSettings = async (
  payload: UpdateUserSettingsPayload
): Promise<ActionResult<UserSettings>> => {
  return {
    ok: true,
    data: {
      ...baseSettings,
      ...payload,
      displayName: payload.displayName ?? baseSettings.displayName,
      updatedAt: new Date()
    }
  };
};

const meta: Meta<typeof UserSettingsForm> = {
  title: 'Users/UserSettingsForm',
  component: UserSettingsForm,
  args: {
    userId: baseSettings.userId,
    initialSettings: baseSettings,
    action: stubUpdateSettings
  }
};

export default meta;

type Story = StoryObj<typeof UserSettingsForm>;

export const Default: Story = {};

export const WithCustomizationPreferences: Story = {
  args: {
    initialSettings: {
      ...baseSettings,
      preferredWorkStartTime: '09:00',
      preferredWorkEndTime: '21:00',
      minBreakBetweenMinutes: 15
    }
  }
};

export const Minimal: Story = {
  args: {
    initialSettings: {
      ...baseSettings,
      displayName: 'Minimal',
      priorities: [],
      constraints: []
    }
  }
};
