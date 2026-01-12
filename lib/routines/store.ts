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
      'A four-day cadence that alternates deep focus blocks with deliberate shutdowns so knowledge workers can reset without burning out.',
    purpose:
      'Protect focus work while giving the nervous system predictable rest. Designed for ICs shipping complex work under pressure.',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['focus', 'reset', 'wellbeing'],
    owner: 'ops@routinehub.dev',
    stats: { forks: 32, applications: 141 },
    timeBlocks: [
      {
        day: 'monday',
        startHour: 8,
        endHour: 12,
        label: 'High-Fidelity Build',
        objective: 'Ship one critical artifact before noon stand-up.',
        energyLevel: 'high'
      },
      {
        day: 'monday',
        startHour: 14,
        endHour: 18,
        label: 'Constraint Debrief',
        objective: 'Document blockers, handoff async updates, and prepare Tuesday focus stack.',
        energyLevel: 'medium'
      },
      {
        day: 'tuesday',
        startHour: 9,
        endHour: 12,
        label: 'Slow Ramp Recovery',
        objective: 'Low-stimulus admin and backlog review to recharge context.',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Product Lead Syncopation',
    description:
      'Anchor decision-making windows for product leads who juggle roadmap, hiring, and coaching while leaving room for strategic drift.',
    purpose:
      'Reduce thrash by carving immovable collaboration windows and async focus pillars.',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['product', 'leadership'],
    owner: 'ops@routinehub.dev',
    stats: { forks: 54, applications: 212 },
    timeBlocks: [
      {
        day: 'wednesday',
        startHour: 9,
        endHour: 12,
        label: 'Roadmap Calibration',
        objective: 'Commit to 3 priority calls with PM + Eng leads.',
        energyLevel: 'high'
      },
      {
        day: 'thursday',
        startHour: 13,
        endHour: 17,
        label: 'Talent Coaching Block',
        objective: 'Batch 1:1s and growth reviews.',
        energyLevel: 'medium'
      }
    ]
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Sabbatical Landing Gear',
    description:
      'Guide knowledge workers into sabbatical mode with deliberate decompression and communication rituals.',
    purpose:
      'Prevent post-leave whiplash by handling handoffs, expectation setting, and health habits before departure.',
    durationType: 'half-day',
    visibility: 'private',
    tags: ['recovery', 'handoff'],
    owner: 'ops@routinehub.dev',
    stats: { forks: 5, applications: 18 },
    timeBlocks: [
      {
        day: 'friday',
        startHour: 9,
        endHour: 12,
        label: 'Expectation Summit',
        objective: 'Outline coverage map and align stakeholders on decision authority.',
        energyLevel: 'medium'
      },
      {
        day: 'friday',
        startHour: 13,
        endHour: 17,
        label: 'Brain Dump Workshop',
        objective: 'Capture domain rituals, metrics, and dependencies before departure.',
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
