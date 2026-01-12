'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/lib/actions/types';
import {
  CreateRoutineInput,
  Routine,
  RoutineBlock,
  RoutineBlockInput,
  RoutineVisibility,
  createRoutineSchema,
  routineBlockInputSchema,
  routineVisibilitySchema,
  routinesRepository
} from '@/lib/routines';
import {
  buildRoutinePreview,
  routineApplicationSchema,
  type RoutineApplicationPreview
} from '@/lib/calendar/mock';

const tagsFromString = (value: string): string[] =>
  value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Unable to parse JSON payload', error);
    return fallback;
  }
};

const extractBlockFromForm = (formData: FormData): RoutineBlockInput[] => {
  const jsonBlocks = formData.get('timeBlocks');
  if (typeof jsonBlocks === 'string' && jsonBlocks.trim().startsWith('[')) {
    return parseJson<RoutineBlockInput[]>(jsonBlocks, []);
  }

  const day = formData.get('blockDay');
  const start = formData.get('blockStartHour');
  const end = formData.get('blockEndHour');
  const label = formData.get('blockLabel');
  const objective = formData.get('blockObjective');

  if (!day || !start || !end || !label || !objective) {
    return [];
  }

  return [
    {
      day: String(day) as RoutineBlockInput['day'],
      startHour: Number(start),
      endHour: Number(end),
      label: String(label),
      objective: String(objective),
      energyLevel: String(formData.get('blockEnergy') ?? 'medium') as RoutineBlockInput['energyLevel']
    }
  ];
};

const toCreateInput = (input: FormData | CreateRoutineInput): CreateRoutineInput => {
  if (input instanceof FormData) {
    const inferredBlocks = extractBlockFromForm(input);
    return {
      name: String(input.get('name') ?? ''),
      description: String(input.get('description') ?? ''),
      purpose: String(input.get('purpose') ?? ''),
      durationType: String(input.get('durationType') ?? 'weekly') as CreateRoutineInput['durationType'],
      visibility: String(input.get('visibility') ?? 'private') as RoutineVisibility,
      tags: tagsFromString(String(input.get('tags') ?? '')),
      owner: String(input.get('owner') ?? 'demo-user@routinehub.dev'),
      timeBlocks:
        inferredBlocks.length > 0
          ? inferredBlocks
          : parseJson<RoutineBlockInput[]>(String(input.get('timeBlocks') ?? '[]'), [])
    };
  }

  return input;
};

const handleActionError = <T>(error: unknown): ActionResult<T> => {
  console.error(error);
  return {
    ok: false,
    error: error instanceof Error ? error.message : 'Unexpected error'
  };
};

const revalidateRoutinePaths = (routineId?: string) => {
  revalidatePath('/');
  revalidatePath('/routines');
  if (routineId) {
    revalidatePath(`/routines/${routineId}`);
  }
};

export async function createRoutineAction(
  input: FormData | CreateRoutineInput
): Promise<ActionResult<Routine>> {
  try {
    const parsed = createRoutineSchema.parse(toCreateInput(input));
    const routine = await routinesRepository.create(parsed);
    revalidateRoutinePaths(routine.id);
    return { ok: true, data: routine };
  } catch (error) {
    return handleActionError<Routine>(error);
  }
}

const visibilityToggleSchema = z.object({
  routineId: z.string().uuid(),
  visibility: routineVisibilitySchema.optional()
});

export type VisibilityTogglePayload = z.infer<typeof visibilityToggleSchema>;

export async function updateRoutineVisibilityAction(
  payload: z.infer<typeof visibilityToggleSchema>
): Promise<ActionResult<Routine>> {
  try {
    const parsed = visibilityToggleSchema.parse(payload);
    const routine = await routinesRepository.get(parsed.routineId);
    if (!routine) {
      throw new Error('Routine not found');
    }

    const nextVisibility: RoutineVisibility =
      parsed.visibility ?? (routine.visibility === 'public' ? 'private' : 'public');

    const updated = await routinesRepository.update({
      id: routine.id,
      patch: {
        visibility: nextVisibility
      }
    });

    revalidateRoutinePaths(routine.id);
    return { ok: true, data: updated };
  } catch (error) {
    return handleActionError<Routine>(error);
  }
}

const addBlockSchema = z.object({
  routineId: z.string().uuid(),
  block: routineBlockInputSchema
});

export async function addRoutineBlockAction(
  payload: z.infer<typeof addBlockSchema>
): Promise<ActionResult<RoutineBlock>> {
  try {
    const parsed = addBlockSchema.parse(payload);
    const block = await routinesRepository.addBlock(parsed.routineId, parsed.block);
    revalidateRoutinePaths(parsed.routineId);
    return { ok: true, data: block };
  } catch (error) {
    return handleActionError<RoutineBlock>(error);
  }
}

const forkRoutineSchema = z.object({
  routineId: z.string().uuid(),
  owner: z.string().min(3),
  overrides: createRoutineSchema.partial().optional()
});

export type ForkRoutinePayload = z.infer<typeof forkRoutineSchema>;

export async function forkRoutineAction(
  payload: z.infer<typeof forkRoutineSchema>
): Promise<ActionResult<Routine>> {
  try {
    const parsed = forkRoutineSchema.parse(payload);
    const forked = await routinesRepository.fork(parsed.routineId, {
      owner: parsed.owner,
      ...parsed.overrides
    });
    revalidateRoutinePaths(forked.id);
    return { ok: true, data: forked };
  } catch (error) {
    return handleActionError<Routine>(error);
  }
}

export type ApplyRoutinePayload = z.infer<typeof routineApplicationSchema>;

export async function applyRoutineAction(
  payload: ApplyRoutinePayload
): Promise<ActionResult<RoutineApplicationPreview>> {
  try {
    const parsed = routineApplicationSchema.parse(payload);
    const routine = await routinesRepository.get(parsed.routineId);
    if (!routine) {
      throw new Error('Routine not found');
    }

    const preview = buildRoutinePreview(routine, parsed);
    await routinesRepository.recordApplication(parsed.routineId);
    revalidateRoutinePaths(parsed.routineId);
    return { ok: true, data: preview };
  } catch (error) {
    return handleActionError<RoutineApplicationPreview>(error);
  }
}
