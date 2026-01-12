import type { RoutineDetailView, RoutineListItem } from '@/lib/routines';

export const mockRoutineListItem: RoutineListItem = {
  id: 'story-routine',
  name: 'Deep Focus Reset',
  description: 'A four-day cadence that alternates deep focus blocks with deliberate shutdowns.',
  purpose: 'Protect focus work with intentional shutdown windows.',
  durationType: 'weekly',
  tags: ['focus', 'reset'],
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
  owner: 'ops@routinehub.dev',
  timeBlocks: [
    {
      id: 'block-1',
      label: 'High Fidelity Build',
      objective: 'Ship one artifact before noon stand-up.',
      hours: 4,
      schedule: 'Monday · 8:00 – 12:00',
      energyLevel: 'high'
    },
    {
      id: 'block-2',
      label: 'Constraint Debrief',
      objective: 'Document blockers and prep next focus stack.',
      hours: 4,
      schedule: 'Tuesday · 14:00 – 18:00',
      energyLevel: 'medium'
    }
  ]
};
