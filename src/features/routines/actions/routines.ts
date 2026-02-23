'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/shared/types/actionResult';
import {
  CreateRoutineInput,
  Routine,
  RoutineBlock,
  RoutineBlockInput,
  RoutineVisibility,
  createRoutineSchema,
  routineBlockInputSchema,
  routineDurationSchema,
  routineVisibilitySchema,
  routinesRepository
} from '@/features/routines';
import { getCurrentUser } from '@/infrastructure/auth/session';
import {
  buildRoutinePreview,
  routineApplicationSchema,
  type RoutineApplicationPreview
} from '@/features/calendar/domain/mock';

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
      owner: String(input.get('owner') ?? 'demo-user@routunehub.dev'),
      normalStartHour: input.get('normalStartHour')
        ? Number(input.get('normalStartHour'))
        : undefined,
      normalEndHour: input.get('normalEndHour')
        ? Number(input.get('normalEndHour'))
        : undefined,
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
  if (error instanceof z.ZodError) {
    const messages = error.issues.map((issue) => issue.message).filter(Boolean);
    return {
      ok: false,
      error: messages.length > 0 ? messages.join(' ') : '入力内容を確認してください。'
    };
  }
  return {
    ok: false,
    error: error instanceof Error ? error.message : '予期しないエラーが発生しました'
  };
};

const revalidateRoutinePaths = (routineId?: string) => {
  revalidatePath('/');
  revalidatePath('/routines');
  revalidatePath('/my-routines');
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
    const currentUser = await getCurrentUser();
    const routine = await routinesRepository.get(
      parsed.routineId,
      currentUser.id,
      currentUser.email,
      currentUser.role === 'admin'
    );
    if (!routine) {
      throw new Error('Routineが見つかりません');
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

export type AddBlockPayload = z.infer<typeof addBlockSchema>;

export async function addRoutineBlockAction(
  payload: AddBlockPayload
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

const updateBlockSchema = z.object({
  routineId: z.string().uuid(),
  blockId: z.string().uuid(),
  block: routineBlockInputSchema
});

export type UpdateBlockPayload = z.infer<typeof updateBlockSchema>;

export async function updateRoutineBlockAction(
  payload: UpdateBlockPayload
): Promise<ActionResult<Routine>> {
  try {
    const parsed = updateBlockSchema.parse(payload);
    const currentUser = await getCurrentUser();
    const routine = await routinesRepository.get(
      parsed.routineId,
      currentUser.id,
      currentUser.email,
      currentUser.role === 'admin'
    );
    if (!routine) {
      throw new Error('Routineが見つかりません');
    }

    const updatedBlocks = routine.timeBlocks.map((block) =>
      block.id === parsed.blockId
        ? {
            ...parsed.block,
            id: parsed.blockId
          }
        : block
    );

    const updated = await routinesRepository.update({
      id: routine.id,
      patch: {
        timeBlocks: updatedBlocks
      }
    });

    revalidateRoutinePaths(routine.id);
    return { ok: true, data: updated };
  } catch (error) {
    return handleActionError<Routine>(error);
  }
}

const deleteBlockSchema = z.object({
  routineId: z.string().uuid(),
  blockId: z.string().uuid()
});

export type DeleteBlockPayload = z.infer<typeof deleteBlockSchema>;

export async function deleteRoutineBlockAction(
  payload: DeleteBlockPayload
): Promise<ActionResult<Routine>> {
  try {
    const parsed = deleteBlockSchema.parse(payload);
    const currentUser = await getCurrentUser();
    const routine = await routinesRepository.get(
      parsed.routineId,
      currentUser.id,
      currentUser.email,
      currentUser.role === 'admin'
    );
    if (!routine) {
      throw new Error('Routine not found');
    }

    if (routine.timeBlocks.length <= 1) {
      throw new Error('最後の時間ブロックは削除できません');
    }

    const updatedBlocks = routine.timeBlocks.filter((block) => block.id !== parsed.blockId);

    const updated = await routinesRepository.update({
      id: routine.id,
      patch: {
        timeBlocks: updatedBlocks
      }
    });

    revalidateRoutinePaths(routine.id);
    return { ok: true, data: updated };
  } catch (error) {
    return handleActionError<Routine>(error);
  }
}

const reorderBlocksSchema = z.object({
  routineId: z.string().uuid(),
  blockIds: z.array(z.string().uuid()).min(1)
});

export type ReorderBlocksPayload = z.infer<typeof reorderBlocksSchema>;

export async function reorderRoutineBlocksAction(
  payload: ReorderBlocksPayload
): Promise<ActionResult<Routine>> {
  try {
    const parsed = reorderBlocksSchema.parse(payload);
    const currentUser = await getCurrentUser();
    const routine = await routinesRepository.get(
      parsed.routineId,
      currentUser.id,
      currentUser.email,
      currentUser.role === 'admin'
    );
    if (!routine) {
      throw new Error('Routineが見つかりません');
    }

    if (parsed.blockIds.length !== routine.timeBlocks.length) {
      throw new Error('ブロックIDの数が一致しません');
    }

    const blockMap = new Map(routine.timeBlocks.map((block) => [block.id, block]));
    const reorderedBlocks = parsed.blockIds
      .map((id) => blockMap.get(id))
      .filter((block): block is RoutineBlock => block !== undefined);

    if (reorderedBlocks.length !== routine.timeBlocks.length) {
      throw new Error('一部のブロックIDが見つかりません');
    }

    const updated = await routinesRepository.update({
      id: routine.id,
      patch: {
        timeBlocks: reorderedBlocks
      }
    });

    revalidateRoutinePaths(routine.id);
    return { ok: true, data: updated };
  } catch (error) {
    return handleActionError<Routine>(error);
  }
}

// createRoutineSchemaにsuperRefineがあるため、.partial()が使えない
// そのため、overridesを直接定義する
const cloneRoutineSchema = z.object({
  routineId: z.string().uuid(),
  overrides: z
    .object({
      name: z.string().min(3).max(80).optional(),
      description: z.string().min(12).max(600).optional(),
      purpose: z.string().min(8).max(500).optional(),
      durationType: routineDurationSchema.optional(),
      visibility: routineVisibilitySchema.optional(),
      tags: z.array(z.string().min(2).max(30)).min(1).max(8).optional(),
      timeBlocks: z.array(routineBlockInputSchema).min(1).optional()
    })
    .optional()
});

/**
 * Clone Routine Payload
 *
 * Used to create a personal copy (clone) of a public Routine.
 * Clones are isolated copies - the original Routine is never modified.
 */
export type CloneRoutinePayload = z.infer<typeof cloneRoutineSchema>;

const deleteRoutineSchema = z.object({
  routineId: z.string().uuid()
});

export type DeleteRoutinePayload = z.infer<typeof deleteRoutineSchema>;

export async function deleteRoutineAction(
  payload: DeleteRoutinePayload
): Promise<ActionResult<void>> {
  try {
    const parsed = deleteRoutineSchema.parse(payload);
    const currentUser = await getCurrentUser();
    const routine = await routinesRepository.get(
      parsed.routineId,
      currentUser.id,
      currentUser.email,
      currentUser.role === 'admin'
    );

    if (!routine) {
      throw new Error('Routineが見つかりません');
    }

    // 所有者のみ削除可能
    if (routine.owner !== currentUser.email && currentUser.role !== 'admin') {
      throw new Error('このRoutineを削除する権限がありません');
    }

    await routinesRepository.delete(parsed.routineId);
    revalidateRoutinePaths();
    return { ok: true, data: undefined };
  } catch (error) {
    return handleActionError<void>(error);
  }
}

const updateRoutineInfoSchema = z.object({
  routineId: z.string().uuid(),
  name: z.string().min(3).max(80).optional(),
  description: z.string().min(12).max(600).optional(),
  purpose: z.string().min(8).max(500).optional(),
  tags: z.array(z.string().min(2).max(30)).min(1).max(8).optional()
});

export type UpdateRoutineInfoPayload = z.infer<typeof updateRoutineInfoSchema>;

export async function updateRoutineInfoAction(
  payload: UpdateRoutineInfoPayload
): Promise<ActionResult<Routine>> {
  try {
    const parsed = updateRoutineInfoSchema.parse(payload);
    const currentUser = await getCurrentUser();
    const routine = await routinesRepository.get(
      parsed.routineId,
      currentUser.id,
      currentUser.email,
      currentUser.role === 'admin'
    );

    if (!routine) {
      throw new Error('Routineが見つかりません');
    }

    // 所有者のみ更新可能
    if (routine.owner !== currentUser.email && currentUser.role !== 'admin') {
      throw new Error('このRoutineを更新する権限がありません');
    }

    const patch: Partial<Routine> = {};
    if (parsed.name !== undefined) patch.name = parsed.name;
    if (parsed.description !== undefined) patch.description = parsed.description;
    if (parsed.purpose !== undefined) patch.purpose = parsed.purpose;
    if (parsed.tags !== undefined) patch.tags = parsed.tags;

    if (Object.keys(patch).length === 0) {
      throw new Error('更新する内容がありません');
    }

    const updated = await routinesRepository.update({
      id: routine.id,
      patch
    });

    revalidateRoutinePaths(routine.id);
    return { ok: true, data: updated };
  } catch (error) {
    return handleActionError<Routine>(error);
  }
}

/**
 * Clone Routine Action
 *
 * Creates a personal copy (clone) of a public Routine.
 * The cloned Routine is private by default and owned by the current user.
 *
 * Design decision: We use "clone" instead of "fork" because:
 * - Clones are personal, isolated copies (not linked to the original)
 * - The original Routine is never modified
 * - Unlike GitHub forks, there's no upstream relationship
 */
export async function cloneRoutineAction(
  payload: z.infer<typeof cloneRoutineSchema>
): Promise<ActionResult<Routine>> {
  try {
    const parsed = cloneRoutineSchema.parse(payload);
    const currentUser = await getCurrentUser();
    const cloned = await routinesRepository.clone(parsed.routineId, {
      owner: currentUser.email,
      ...parsed.overrides
    });
    revalidateRoutinePaths(cloned.id);
    return { ok: true, data: cloned };
  } catch (error) {
    return handleActionError<Routine>(error);
  }
}

export type ApplyRoutinePayload = z.infer<typeof routineApplicationSchema>;

const toggleLikeSchema = z.object({
  routineId: z.string().uuid(),
  userId: z.string().min(1)
});

export type ToggleLikePayload = z.infer<typeof toggleLikeSchema>;

export async function toggleRoutineLikeAction(
  payload: ToggleLikePayload
): Promise<ActionResult<{ liked: boolean; likes: number }>> {
  try {
    const parsed = toggleLikeSchema.parse(payload);
    const result = await routinesRepository.toggleLike(parsed.routineId, parsed.userId);
    revalidateRoutinePaths(parsed.routineId);
    return { ok: true, data: result };
  } catch (error) {
    return handleActionError<{ liked: boolean; likes: number }>(error);
  }
}

export async function applyRoutineAction(
  payload: ApplyRoutinePayload
): Promise<ActionResult<RoutineApplicationPreview>> {
  try {
    const parsed = routineApplicationSchema.parse(payload);
    const currentUser = await getCurrentUser();
    const routine = await routinesRepository.get(
      parsed.routineId,
      currentUser.id,
      currentUser.email,
      currentUser.role === 'admin'
    );
    if (!routine) {
      throw new Error('Routineが見つかりません');
    }

    const preview = buildRoutinePreview(routine, parsed);
    await routinesRepository.recordApplication(parsed.routineId);
    revalidateRoutinePaths(parsed.routineId);
    return { ok: true, data: preview };
  } catch (error) {
    return handleActionError<RoutineApplicationPreview>(error);
  }
}
