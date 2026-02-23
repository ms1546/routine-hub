import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { dynamoDBDocumentClient, ROUTINES_TABLE } from '@/infrastructure/db/dynamodb-client';
import { createNodeUUIDGenerator } from '@/shared/utils/uuid';
import {
  CreateRoutineInput,
  Routine,
  RoutineBlock,
  RoutineBlockInput,
  RoutineFilter,
  createRoutineSchema,
  routineBlockInputSchema,
  routineSchema,
  updateRoutineSchema
} from './models';

const generateUUID = createNodeUUIDGenerator();

type RoutineRecord = {
  routineId: string;
  name: string;
  description: string;
  purpose: string;
  durationType: Routine['durationType'];
  visibility: Routine['visibility'];
  tags: Routine['tags'];
  owner: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
  timeBlocks: Routine['timeBlocks'];
  normalStartHour?: number;
  normalEndHour?: number;
  stats?: Routine['stats'];
  likedBy?: string[];
};

const clone = <T>(value: T): T => structuredClone(value);

const toRoutineRecord = (routine: Routine, likedBy?: string[]): RoutineRecord => ({
  routineId: routine.id,
  name: routine.name,
  description: routine.description,
  purpose: routine.purpose,
  durationType: routine.durationType,
  visibility: routine.visibility,
  tags: routine.tags,
  owner: routine.owner,
  createdAt: routine.createdAt.toISOString(),
  updatedAt: routine.updatedAt.toISOString(),
  version: routine.version,
  timeBlocks: routine.timeBlocks,
  normalStartHour: routine.normalStartHour,
  normalEndHour: routine.normalEndHour,
  stats: routine.stats,
  likedBy: likedBy && likedBy.length > 0 ? likedBy : undefined
});

const fromRoutineRecord = (record: RoutineRecord): { routine: Routine; likedBy: string[] } => {
  const routine: Routine = {
    id: record.routineId,
    name: record.name,
    description: record.description,
    purpose: record.purpose,
    durationType: record.durationType,
    visibility: record.visibility,
    tags: record.tags ?? [],
    owner: record.owner,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    version: record.version ?? 1,
    timeBlocks: record.timeBlocks ?? [],
    normalStartHour: record.normalStartHour,
    normalEndHour: record.normalEndHour,
    stats: record.stats ?? {
      clones: 0,
      applications: 0,
      likes: 0
    }
  };

  routineSchema.parse(routine);
  return { routine: clone(routine), likedBy: record.likedBy ?? [] };
};

const applyFilter = (routine: Routine, filter: RoutineFilter): boolean => {
  if (filter.visibility && routine.visibility !== filter.visibility) {
    return false;
  }
  if (filter.duration && routine.durationType !== filter.duration) {
    return false;
  }
  if (filter.tag) {
    const routineTags = routine.tags.map((t) => t.toLowerCase());
    const filterTag = filter.tag.toLowerCase();
    if (!routineTags.includes(filterTag)) {
      return false;
    }
  }
  return true;
};

const filterByOwner = (routine: Routine, userId?: string, userEmail?: string): boolean => {
  if (!userId && !userEmail) {
    return true;
  }
  return (userEmail && routine.owner === userEmail) || (userId && routine.owner === userId) ? true : false;
};

const fetchRoutineRecord = async (routineId: string): Promise<RoutineRecord | null> => {
  const result = await dynamoDBDocumentClient.send(
    new GetCommand({
      TableName: ROUTINES_TABLE,
      Key: { routineId }
    })
  );

  return (result.Item as RoutineRecord | undefined) ?? null;
};

const list = async (
  filter?: RoutineFilter,
  userId?: string,
  userEmail?: string
): Promise<Routine[]> => {
  const result = await dynamoDBDocumentClient.send(
    new ScanCommand({
      TableName: ROUTINES_TABLE
    })
  );

  const items = (result.Items ?? []) as RoutineRecord[];
  const routines = items.map((item) => fromRoutineRecord(item).routine);
  let filtered = filter ? routines.filter((routine) => applyFilter(routine, filter)) : routines;

  filtered = filtered.filter((routine) => filterByOwner(routine, userId, userEmail));
  return filtered.map(clone);
};

const get = async (id: string, userId?: string, userEmail?: string): Promise<Routine | null> => {
  const record = await fetchRoutineRecord(id);
  if (!record) {
    return null;
  }

  const { routine } = fromRoutineRecord(record);
  if (
    routine.visibility === 'private' &&
    routine.owner !== userId &&
    routine.owner !== userEmail
  ) {
    return null;
  }

  return clone(routine);
};

const create = async (input: CreateRoutineInput): Promise<Routine> => {
  const payload = createRoutineSchema.parse({ ...input, tags: input.tags ?? [] });
  const now = new Date();
  const routine: Routine = {
    id: generateUUID(),
    name: payload.name,
    description: payload.description,
    purpose: payload.purpose,
    durationType: payload.durationType,
    visibility: payload.visibility,
    tags: payload.tags,
    owner: payload.owner,
    createdAt: now,
    updatedAt: now,
    version: 1,
    timeBlocks: payload.timeBlocks.map((block) => ({
      ...block,
      id: block.id ?? generateUUID()
    })),
    normalStartHour: payload.normalStartHour,
    normalEndHour: payload.normalEndHour,
    stats: {
      clones: 0,
      applications: 0,
      likes: 0
    }
  };

  routineSchema.parse(routine);

  await dynamoDBDocumentClient.send(
    new PutCommand({
      TableName: ROUTINES_TABLE,
      Item: toRoutineRecord(routine)
    })
  );

  return clone(routine);
};

const update = async (input: z.infer<typeof updateRoutineSchema>): Promise<Routine> => {
  const currentRecord = await fetchRoutineRecord(input.id);
  if (!currentRecord) {
    throw new Error('Routine not found');
  }

  const { routine: current, likedBy } = fromRoutineRecord(currentRecord);
  const parsed = updateRoutineSchema.parse(input);
  const patch = parsed.patch;

  const next: Routine = {
    ...current,
    ...patch,
    updatedAt: new Date(),
    version: current.version + 1,
    timeBlocks: patch.timeBlocks
      ? patch.timeBlocks.map((block) => ({
          ...block,
          id: block.id ?? generateUUID()
        }))
      : current.timeBlocks,
    stats: {
      clones: patch.stats?.clones ?? current.stats.clones,
      applications: patch.stats?.applications ?? current.stats.applications,
      likes: patch.stats?.likes ?? current.stats.likes
    }
  };

  routineSchema.parse(next);

  await dynamoDBDocumentClient.send(
    new PutCommand({
      TableName: ROUTINES_TABLE,
      Item: toRoutineRecord(next, likedBy)
    })
  );

  return clone(next);
};

const addBlock = async (routineId: string, blockInput: RoutineBlockInput): Promise<RoutineBlock> => {
  const currentRecord = await fetchRoutineRecord(routineId);
  if (!currentRecord) {
    throw new Error('Routine not found');
  }

  const { routine, likedBy } = fromRoutineRecord(currentRecord);
  const parsedBlock = routineBlockInputSchema.parse(blockInput);
  const block: RoutineBlock = {
    ...parsedBlock,
    id: parsedBlock.id ?? generateUUID()
  };

  const updated: Routine = {
    ...routine,
    timeBlocks: [...routine.timeBlocks, block],
    updatedAt: new Date(),
    version: routine.version + 1
  };

  routineSchema.parse(updated);

  await dynamoDBDocumentClient.send(
    new PutCommand({
      TableName: ROUTINES_TABLE,
      Item: toRoutineRecord(updated, likedBy)
    })
  );

  return clone(block);
};

const cloneRoutine = async (
  routineId: string,
  overrides: Partial<CreateRoutineInput> & { owner: string }
): Promise<Routine> => {
  const currentRecord = await fetchRoutineRecord(routineId);
  if (!currentRecord) {
    throw new Error('Routine not found');
  }

  const { routine: current } = fromRoutineRecord(currentRecord);

  const cloneInput: CreateRoutineInput = {
    name: overrides.name ?? `${current.name} (Copy)`,
    description: overrides.description ?? current.description,
    purpose: overrides.purpose ?? current.purpose,
    durationType: overrides.durationType ?? current.durationType,
    visibility: overrides.visibility ?? 'private',
    tags: overrides.tags ?? current.tags,
    owner: overrides.owner,
    timeBlocks: overrides.timeBlocks ?? current.timeBlocks.map((block) => ({
      ...block,
      id: generateUUID()
    })),
    normalStartHour: overrides.normalStartHour ?? current.normalStartHour,
    normalEndHour: overrides.normalEndHour ?? current.normalEndHour
  };

  const cloned = await create(cloneInput);
  return cloned;
};

const recordApplication = async (routineId: string): Promise<void> => {
  const currentRecord = await fetchRoutineRecord(routineId);
  if (!currentRecord) {
    return;
  }

  const { routine, likedBy } = fromRoutineRecord(currentRecord);
  const updated: Routine = {
    ...routine,
    stats: {
      ...routine.stats,
      applications: routine.stats.applications + 1
    },
    updatedAt: new Date(),
    version: routine.version + 1
  };

  routineSchema.parse(updated);

  await dynamoDBDocumentClient.send(
    new PutCommand({
      TableName: ROUTINES_TABLE,
      Item: toRoutineRecord(updated, likedBy)
    })
  );
};

const toggleLike = async (routineId: string, userId: string): Promise<{ liked: boolean; likes: number }> => {
  const currentRecord = await fetchRoutineRecord(routineId);
  if (!currentRecord) {
    throw new Error('Routine not found');
  }

  const { routine, likedBy } = fromRoutineRecord(currentRecord);
  const hasLiked = likedBy.includes(userId);
  const nextLikedBy = hasLiked ? likedBy.filter((id) => id !== userId) : [...likedBy, userId];
  const nextLikes = Math.max(0, routine.stats.likes + (hasLiked ? -1 : 1));

  const updated: Routine = {
    ...routine,
    stats: {
      ...routine.stats,
      likes: nextLikes
    },
    updatedAt: new Date(),
    version: routine.version + 1
  };

  routineSchema.parse(updated);

  await dynamoDBDocumentClient.send(
    new PutCommand({
      TableName: ROUTINES_TABLE,
      Item: toRoutineRecord(updated, nextLikedBy)
    })
  );

  return { liked: !hasLiked, likes: nextLikes };
};

const isLikedByUser = async (routineId: string, userId: string): Promise<boolean> => {
  const record = await fetchRoutineRecord(routineId);
  if (!record) {
    return false;
  }

  const likedBy = record.likedBy ?? [];
  return likedBy.includes(userId);
};

const deleteRoutine = async (routineId: string, userId?: string): Promise<void> => {
  const record = await fetchRoutineRecord(routineId);
  if (!record) {
    throw new Error('Routine not found');
  }

  if (userId && record.owner !== userId) {
    throw new Error('Unauthorized');
  }

  await dynamoDBDocumentClient.send(
    new DeleteCommand({
      TableName: ROUTINES_TABLE,
      Key: { routineId }
    })
  );
};

export const routinesRepositoryDynamoDB = {
  list,
  get,
  create,
  update,
  addBlock,
  clone: cloneRoutine,
  recordApplication,
  toggleLike,
  isLikedByUser,
  delete: deleteRoutine
};
