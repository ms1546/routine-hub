import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  CreateRoutineInput,
  Routine,
  RoutineBlock,
  RoutineBlockInput,
  RoutineFilter,
  RoutineVisibility,
  createRoutineSchema,
  normalizeTags,
  routineBlockInputSchema,
  routineSchema,
  updateRoutineSchema
} from './models';

const routineStore = new Map<string, Routine>();

const clone = <T>(value: T): T => structuredClone(value);

type SeedRoutine = CreateRoutineInput & {
  stats?: Routine['stats'];
  id?: string;
};

const seedRoutines: SeedRoutine[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Deep Focus Reset',
    description:
      '月曜午前に深い集中ブロック、午後に振り返りを置き、火曜は低刺激タスクで体力を戻す 4 ブロック構成。',
    purpose:
      'ハードな開発サイクルで疲弊する個人開発者が、ペースを崩さず成果物を届けられるよう支援する。',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['集中', '休息', 'リズム'],
    owner: 'ops@routinehub.dev',
    stats: { forks: 32, applications: 141 },
    timeBlocks: [
      {
        day: 'monday',
        startHour: 8,
        endHour: 12,
        label: '高精度ビルド',
        objective: '午前中のスタンドアップ前に主要成果物を仕上げる。',
        energyLevel: 'high'
      },
      {
        day: 'monday',
        startHour: 14,
        endHour: 18,
        label: '制約ふりかえり',
        objective: '阻害要因を洗い出して非同期で共有し、翌日の準備を整える。',
        energyLevel: 'medium'
      },
      {
        day: 'tuesday',
        startHour: 9,
        endHour: 12,
        label: 'スロースタート回復',
        objective: '低刺激の事務処理とバックログ整理で脳の緊張をほどく。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Product Lead Syncopation',
    description:
      '意思決定とコーチングを週内で揺らぎなく配置し、突発案件のための遊びも残すリズム。',
    purpose:
      'ロードマップ・採用・育成を同時進行するリードが、齟齬なく意思決定できる状態を守る。',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['プロダクト', 'リーダーシップ'],
    owner: 'ops@routinehub.dev',
    stats: { forks: 54, applications: 212 },
    timeBlocks: [
      {
        day: 'wednesday',
        startHour: 9,
        endHour: 12,
        label: 'ロードマップ調律',
        objective: 'PM/Eng との優先順位すり合わせをまとめて実施。',
        energyLevel: 'high'
      },
      {
        day: 'thursday',
        startHour: 13,
        endHour: 17,
        label: 'メンバーコーチング',
        objective: '1on1 と成長レビューを塊で行い、文脈切替を減らす。',
        energyLevel: 'medium'
      }
    ]
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Sabbatical Landing Gear',
    description:
      '長期休暇前の引き継ぎと心身の減速を 1 日でやり切るための 2 ブロック構成。',
    purpose:
      '休暇前後のギャップを軽減し、関係者の権限や期待を明文化しておく。',
    durationType: 'half-day',
    visibility: 'private',
    tags: ['休暇準備', '引き継ぎ'],
    owner: 'ops@routinehub.dev',
    stats: { forks: 5, applications: 18 },
    timeBlocks: [
      {
        day: 'friday',
        startHour: 9,
        endHour: 12,
        label: '期待値すり合わせ',
        objective: '担当範囲と意思決定の委譲ラインを明確にする。',
        energyLevel: 'medium'
      },
      {
        day: 'friday',
        startHour: 13,
        endHour: 17,
        label: '知識ダンプ',
        objective: '業務ノウハウ・定例・依存関係をまとめて書き出す。',
        energyLevel: 'low'
      }
    ]
  }
];

const hydrateRoutine = (input: SeedRoutine): Routine => {
  const parsed = createRoutineSchema.parse(input);
  const now = new Date();
  const routine: Routine = {
    id: input.id ?? randomUUID(),
    name: parsed.name,
    description: parsed.description,
    purpose: parsed.purpose,
    durationType: parsed.durationType,
    visibility: parsed.visibility,
    tags: normalizeTags(parsed.tags),
    owner: parsed.owner,
    createdAt: now,
    updatedAt: now,
    version: 1,
    timeBlocks: parsed.timeBlocks.map((block) => ({
      ...block,
      id: block.id ?? randomUUID()
    })),
    stats: input.stats ?? { forks: 0, applications: 0 }
  };

  routineSchema.parse(routine);
  return routine;
};

seedRoutines.forEach((seed) => {
  const routine = hydrateRoutine(seed);
  routineStore.set(routine.id, routine);
});

const applyFilter = (routine: Routine, filter?: RoutineFilter): boolean => {
  if (!filter) return true;
  if (filter.visibility && routine.visibility !== filter.visibility) return false;
  if (filter.duration && routine.durationType !== filter.duration) return false;
  if (filter.tag && !routine.tags.includes(filter.tag.toLowerCase())) return false;
  return true;
};

const list = async (filter?: RoutineFilter): Promise<Routine[]> => {
  const routines = Array.from(routineStore.values()).filter((routine) => applyFilter(routine, filter));
  return routines.map((routine) => clone(routine));
};

const get = async (id: string): Promise<Routine | null> => {
  const routine = routineStore.get(id);
  return routine ? clone(routine) : null;
};

const create = async (input: CreateRoutineInput): Promise<Routine> => {
  const payload = createRoutineSchema.parse({ ...input, tags: normalizeTags(input.tags) });
  const now = new Date();
  const routine: Routine = {
    id: randomUUID(),
    version: 1,
    createdAt: now,
    updatedAt: now,
    stats: { forks: 0, applications: 0 },
    ...payload,
    tags: normalizeTags(payload.tags),
    timeBlocks: payload.timeBlocks.map((block) => ({
      ...block,
      id: block.id ?? randomUUID()
    }))
  };

  routineSchema.parse(routine);
  routineStore.set(routine.id, routine);
  return clone(routine);
};

const update = async (input: z.infer<typeof updateRoutineSchema>): Promise<Routine> => {
  const parsed = updateRoutineSchema.parse(input);
  const current = routineStore.get(parsed.id);

  if (!current) {
    throw new Error(`Routine ${parsed.id} not found`);
  }

  const patch = { ...parsed.patch } as Partial<Routine>;
  const next: Routine = {
    ...current,
    ...patch,
    tags: patch.tags ? normalizeTags(patch.tags) : current.tags,
    timeBlocks: patch.timeBlocks
      ? patch.timeBlocks.map((block) => ({
          ...block,
          id: block.id ?? randomUUID()
        }))
      : current.timeBlocks,
    updatedAt: new Date(),
    version: current.version + 1
  };

  routineSchema.parse(next);
  routineStore.set(next.id, next);
  return clone(next);
};

const addBlock = async (routineId: string, blockInput: RoutineBlockInput): Promise<RoutineBlock> => {
  const parsedBlock = routineBlockInputSchema.parse(blockInput);
  const routine = routineStore.get(routineId);
  if (!routine) {
    throw new Error(`Routine ${routineId} not found`);
  }

  const block: RoutineBlock = {
    ...parsedBlock,
    id: parsedBlock.id ?? randomUUID()
  };

  const next: Routine = {
    ...routine,
    timeBlocks: [...routine.timeBlocks, block],
    updatedAt: new Date(),
    version: routine.version + 1
  };

  routineSchema.parse(next);
  routineStore.set(next.id, next);
  return clone(block);
};

const fork = async (
  routineId: string,
  overrides: Partial<CreateRoutineInput> & { owner: string }
): Promise<Routine> => {
  const source = routineStore.get(routineId);
  if (!source) {
    throw new Error(`Routine ${routineId} not found`);
  }

  const forkInput: CreateRoutineInput = {
    name: overrides.name ?? `${source.name} (Fork)`,
    description: overrides.description ?? source.description,
    purpose: overrides.purpose ?? source.purpose,
    durationType: overrides.durationType ?? source.durationType,
    visibility: overrides.visibility ?? 'private',
    tags: overrides.tags ?? source.tags,
    owner: overrides.owner,
    timeBlocks: overrides.timeBlocks ?? source.timeBlocks.map((block) => ({
      ...block,
      id: randomUUID()
    }))
  };

  const forked = await create(forkInput);
  const sourceRoutine = routineStore.get(routineId);
  if (sourceRoutine) {
    routineStore.set(routineId, {
      ...sourceRoutine,
      stats: {
        ...sourceRoutine.stats,
        forks: sourceRoutine.stats.forks + 1
      }
    });
  }
  return forked;
};

const recordApplication = async (routineId: string): Promise<Routine | null> => {
  const routine = routineStore.get(routineId);
  if (!routine) return null;
  const next: Routine = {
    ...routine,
    stats: {
      ...routine.stats,
      applications: routine.stats.applications + 1
    },
    updatedAt: new Date(),
    version: routine.version + 1
  };
  routineStore.set(next.id, next);
  return clone(next);
};

export const routinesRepository = {
  list,
  get,
  create,
  update,
  addBlock,
  fork,
  recordApplication
};
