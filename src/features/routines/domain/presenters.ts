import { getOwnerId, Routine } from './models';

export type RoutineListItem = {
  id: string;
  name: string;
  description: string;
  purpose: string;
  durationType: Routine['durationType'];
  tags: string[];
  visibility: Routine['visibility'];
  owner: Routine['owner']; // 表示用アカウント名
  ownerId?: string; // 所有権チェック用（メールアドレス）
  totalHours: number;
  blockCount: number;
  highlightDay: string;
  intensity: 'light' | 'steady' | 'immersive';
  stats: Routine['stats'];
  timeBlocks: RoutineBlockView[]; // スケジュール可視化に必要
  createdAt?: string; // My Routinesページで使用
  updatedAt?: string; // My Routinesページで使用
};

export type RoutineBlockView = {
  id: string;
  label: string;
  objective: string;
  hours: number;
  schedule: string;
  energyLevel: string;
  startHour: number;
  endHour: number;
  day: Weekday;
};

export type RoutineDetailView = RoutineListItem & {
  createdAt: string;
  updatedAt: string;
  owner: string;
  timeBlocks: RoutineBlockView[];
  /** normal タイプの場合の時間範囲。編集時のタイムライン表示に使用 */
  normalStartHour?: number;
  normalEndHour?: number;
};

const dayLabels = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
} as const;

type Weekday = keyof typeof dayLabels;

const formatSchedule = (day: Weekday, startHour: number, endHour: number) =>
  `${dayLabels[day]} · ${startHour}:00 – ${endHour}:00`;

const computeIntensity = (totalHours: number): RoutineListItem['intensity'] => {
  if (totalHours <= 6) return 'light';
  if (totalHours <= 16) return 'steady';
  return 'immersive';
};

export const toRoutineListItem = (routine: Routine): RoutineListItem => {
  const totalHours = routine.timeBlocks.reduce((acc, block) => acc + (block.endHour - block.startHour), 0);
  const blockCount = routine.timeBlocks.length;
  const [highlightBlock] = [...routine.timeBlocks].sort((a, b) => a.startHour - b.startHour);
  const highlightDay = highlightBlock?.day ?? 'monday';

  return {
    id: routine.id,
    name: routine.name,
    description: routine.description,
    purpose: routine.purpose,
    durationType: routine.durationType,
    tags: routine.tags,
    visibility: routine.visibility,
    owner: routine.owner,
    ownerId: routine.ownerId,
    totalHours,
    blockCount,
    highlightDay: dayLabels[highlightDay as Weekday],
    intensity: computeIntensity(totalHours),
    stats: routine.stats,
    timeBlocks: routine.timeBlocks.map((block) => ({
      id: block.id,
      label: block.label,
      objective: block.objective,
      hours: block.endHour - block.startHour,
      schedule: formatSchedule(block.day as Weekday, block.startHour, block.endHour),
      energyLevel: block.energyLevel,
      startHour: block.startHour,
      endHour: block.endHour,
      day: block.day as Weekday
    })),
    createdAt: routine.createdAt.toISOString(),
    updatedAt: routine.updatedAt.toISOString()
  };
};

export const toRoutineDetail = (routine: Routine): RoutineDetailView => {
  const listItem = toRoutineListItem(routine);

  return {
    ...listItem,
    createdAt: routine.createdAt.toISOString(),
    updatedAt: routine.updatedAt.toISOString(),
    owner: routine.owner,
    normalStartHour: routine.normalStartHour,
    normalEndHour: routine.normalEndHour,
    timeBlocks: routine.timeBlocks.map((block) => ({
      id: block.id,
      label: block.label,
      objective: block.objective,
      hours: block.endHour - block.startHour,
      schedule: formatSchedule(block.day as Weekday, block.startHour, block.endHour),
      energyLevel: block.energyLevel,
      startHour: block.startHour,
      endHour: block.endHour,
      day: block.day as Weekday
    }))
  };
};
