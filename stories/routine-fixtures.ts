import type { RoutineDetailView, RoutineListItem } from '@/lib/routines';

export const mockRoutineListItem: RoutineListItem = {
  id: 'story-routine',
  name: 'Deep Focus Reset',
  description: '集中ブロックと意図的なシャットダウンを交互に配置した 4 ブロック構成。',
  purpose: '集中作業を守りながら燃え尽きを防ぐ。',
  durationType: 'weekly',
  tags: ['集中', '休息'],
  visibility: 'public',
  totalHours: 12,
  blockCount: 3,
  highlightDay: 'Monday',
  intensity: 'steady',
  stats: { forks: 41, applications: 180 }
};

export const mockRoutineDetail: RoutineDetailView = {
  ...mockRoutineListItem,
  createdAt: new Date('2024-01-10').toISOString(),
  updatedAt: new Date('2024-03-18').toISOString(),
  owner: 'routinehub.dev@gmail.com',
  timeBlocks: [
    {
      id: 'block-1',
      label: '集中ビルド',
      objective: '午前のスタンドアップ前に主要成果物をまとめる。',
      hours: 4,
      schedule: 'Monday · 8:00 – 12:00',
      energyLevel: 'high',
      startHour: 8,
      endHour: 12,
      day: 'monday'
    },
    {
      id: 'block-2',
      label: '制約ふりかえり',
      objective: 'ボトルネックを可視化し翌日の準備を進める。',
      hours: 4,
      schedule: 'Tuesday · 14:00 – 18:00',
      energyLevel: 'medium',
      startHour: 14,
      endHour: 18,
      day: 'tuesday'
    }
  ]
};

export const mockProposedEvents = [
  {
    proposalId: 'mock-1',
    routineId: 'story-routine',
    blockId: 'block-1',
    title: 'Deep Focus Reset · 集中ビルド',
    description: '主要成果物をまとめる',
    start: '2025-02-01T00:00:00.000Z',
    end: '2025-02-01T03:00:00.000Z',
    status: 'pending' as const
  }
];

export const mockExistingEvents = [
  {
    id: 'existing-1',
    title: '朝ラン',
    start: '2025-02-01T06:00:00.000Z',
    end: '2025-02-01T07:00:00.000Z'
  }
];
