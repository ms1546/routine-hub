/**
 * Routines Domain Store
 *
 * This file contains the in-memory store for routines.
 * It uses dependency injection for UUID generation to support both
 * Node.js (node:crypto) and browser (crypto.randomUUID) environments.
 *
 * Clean Architecture: Domain layer should not depend on Node.js-specific APIs.
 * UUID generation is injected via createRoutinesRepository function.
 */

import { z } from 'zod';
import type { UUIDGenerator } from '@/shared/utils/uuid';
import {
  CreateRoutineInput,
  Routine,
  RoutineBlock,
  RoutineBlockInput,
  RoutineFilter,
  RoutineVisibility,
  createRoutineSchema,
  getOwnerId,
  routineBlockInputSchema,
  routineSchema,
  updateRoutineSchema
} from './models';

const globalStoreKey = '__routuneHubRoutineStore__';
const globalStore = globalThis as typeof globalThis & {
  [key: string]: Map<string, Routine> | undefined;
};
const routineStore = globalStore[globalStoreKey] ?? new Map<string, Routine>();
globalStore[globalStoreKey] = routineStore;

const clone = <T>(value: T): T => structuredClone(value);

// UUID generator - injected from outside (default: will be set by createRoutinesRepository)
let generateUUID: UUIDGenerator = () => {
  throw new Error('UUID generator not initialized. Call createRoutinesRepository() first.');
};

type SeedRoutine = CreateRoutineInput & {
  stats?: Routine['stats'];
  id?: string;
};

const seedRoutines: SeedRoutine[] = [
  // Seed data can be added here if needed
];

const hydrateRoutine = (input: SeedRoutine): Routine => {
  try {
    const parsed = createRoutineSchema.parse({
      ...input,
      tags: input.tags ?? [],
      timeBlocks: input.timeBlocks ?? []
    });
    const routine: Routine = {
      id: input.id ?? generateUUID(),
      name: parsed.name,
      description: parsed.description,
      purpose: parsed.purpose,
      durationType: parsed.durationType,
      visibility: parsed.visibility,
      tags: parsed.tags,
      owner: parsed.owner,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      timeBlocks: parsed.timeBlocks.map((block) => ({
        ...block,
        id: generateUUID()
      })),
      normalStartHour: parsed.normalStartHour,
      normalEndHour: parsed.normalEndHour,
      stats: input.stats ?? {
        clones: 0,
        applications: 0,
        likes: 0
      }
    };
    routineSchema.parse(routine);
    return routine;
  } catch (error) {
    console.error(`Error hydrating routine "${input.name}":`, error);
    throw error;
  }
};

const applyFilter = (routine: Routine, filter: RoutineFilter): boolean => {
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
  if (filter.query && filter.query.trim()) {
    const q = filter.query.trim().toLowerCase();
    const name = (routine.name ?? '').toLowerCase();
    const description = (routine.description ?? '').toLowerCase();
    const purpose = (routine.purpose ?? '').toLowerCase();
    if (!name.includes(q) && !description.includes(q) && !purpose.includes(q)) {
      return false;
    }
  }
  return true;
};

const list = async (
  filter?: RoutineFilter,
  userId?: string,
  userEmail?: string,
  isAdmin = false
): Promise<Routine[]> => {
  const routines = Array.from(routineStore.values());
  let filtered = filter ? routines.filter((r) => applyFilter(r, filter)) : routines;

  if (!isAdmin && (userId || userEmail)) {
    const isOwn = (r: Routine) => {
      const oid = getOwnerId(r);
      return (userEmail && oid === userEmail) || (userId && oid === userId);
    };
    filtered = filtered.filter((r) => r.visibility === 'public' || isOwn(r));
  }

  return filtered.map(clone);
};

const get = async (id: string, userId?: string, userEmail?: string, isAdmin = false): Promise<Routine | null> => {
  const routine = routineStore.get(id);
  if (!routine) {
    return null;
  }
  const ownerId = getOwnerId(routine);
  if (
    routine.visibility === 'private' &&
    ownerId !== userId &&
    ownerId !== userEmail &&
    !isAdmin
  ) {
    return null;
  }
  return clone(routine);
};

const create = async (input: CreateRoutineInput & { ownerId?: string }): Promise<Routine> => {
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
    ownerId: input.ownerId ?? (payload as { ownerId?: string }).ownerId,
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
  routineStore.set(routine.id, routine);
  return clone(routine);
};

const update = async (input: z.infer<typeof updateRoutineSchema>): Promise<Routine> => {
  const current = routineStore.get(input.id);
  if (!current) {
    throw new Error('Routine not found');
  }
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
  routineStore.set(next.id, next);
  return clone(next);
};

const addBlock = async (routineId: string, blockInput: RoutineBlockInput): Promise<RoutineBlock> => {
  const routine = routineStore.get(routineId);
  if (!routine) {
    throw new Error('Routine not found');
  }
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
  routineStore.set(updated.id, updated);
  return clone(block);
};

const cloneRoutine = async (
  routineId: string,
  overrides: Partial<CreateRoutineInput> & { owner: string; ownerId?: string }
): Promise<Routine> => {
  const source = routineStore.get(routineId);
  if (!source) {
    throw new Error('Routine not found');
  }
  const cloneInput: CreateRoutineInput & { ownerId?: string } = {
    name: overrides.name ?? `${source.name} (Copy)`,
    description: overrides.description ?? source.description,
    purpose: overrides.purpose ?? source.purpose,
    durationType: overrides.durationType ?? source.durationType,
    visibility: overrides.visibility ?? 'private',
    tags: overrides.tags ?? source.tags,
    owner: overrides.owner,
    ownerId: overrides.ownerId,
    timeBlocks: overrides.timeBlocks ?? source.timeBlocks.map((block) => ({
      ...block,
      id: generateUUID()
    })),
    normalStartHour: overrides.normalStartHour ?? source.normalStartHour,
    normalEndHour: overrides.normalEndHour ?? source.normalEndHour
  };
  const cloned = await create(cloneInput);
  return cloned;
};

const recordApplication = async (routineId: string): Promise<void> => {
  const routine = routineStore.get(routineId);
  if (!routine) {
    return;
  }
  routine.stats.applications += 1;
  routineStore.set(routine.id, routine);
};

const toggleLike = async (routineId: string, userId: string): Promise<{ liked: boolean; likes: number }> => {
  const routine = routineStore.get(routineId);
  if (!routine) {
    throw new Error('Routine not found');
  }
  // Simple implementation: track likes in a separate structure
  // In a real implementation, this would be in a separate table
  const liked = (routine as any).likedBy?.includes(userId) ?? false;
  if (liked) {
    routine.stats.likes = Math.max(0, routine.stats.likes - 1);
    (routine as any).likedBy = ((routine as any).likedBy ?? []).filter((id: string) => id !== userId);
  } else {
    routine.stats.likes += 1;
    (routine as any).likedBy = [...((routine as any).likedBy ?? []), userId];
  }
  routineStore.set(routine.id, routine);
  return { liked: !liked, likes: routine.stats.likes };
};

const isLikedByUser = async (routineId: string, userId: string): Promise<boolean> => {
  const routine = routineStore.get(routineId);
  if (!routine) {
    return false;
  }
  return (routine as any).likedBy?.includes(userId) ?? false;
};

const deleteRoutine = async (routineId: string, userId?: string): Promise<void> => {
  const routine = routineStore.get(routineId);
  if (!routine) {
    throw new Error('Routine not found');
  }
  const ownerId = getOwnerId(routine);
  if (userId && ownerId !== userId) {
    throw new Error('Unauthorized');
  }
  routineStore.delete(routineId);
};

/**
 * Create routines repository with injected UUID generator
 * This allows dependency injection for different environments (Node.js vs Browser)
 */
export function createRoutinesRepository(uuidGenerator: UUIDGenerator) {
  // Set the UUID generator for this module
  generateUUID = uuidGenerator;

  // Re-hydrate seed data with the new UUID generator
  // This is necessary because seed data is loaded at module initialization time
  const existingRoutines = Array.from(routineStore.keys());
  if (existingRoutines.length === 0) {
    // Only seed if store is empty (first initialization)
    seedRoutines.forEach((seed) => {
      try {
        const routine = hydrateRoutine(seed);
        routineStore.set(routine.id, routine);
      } catch (error) {
        console.error(`Failed to hydrate routine "${seed.name}":`, error);
      }
    });
  }

  return {
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
}

// Export routinesRepository for backward compatibility
// This will be initialized by repository.ts
export const routinesRepository = createRoutinesRepository(() => {
  throw new Error('routinesRepository not initialized. Use repository.ts instead.');
});
