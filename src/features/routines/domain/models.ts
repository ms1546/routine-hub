import { z } from 'zod';

export const weekdaySchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]);

export const routineDurationSchema = z.enum(['normal', 'weekly']);
export const routineVisibilitySchema = z.enum(['public', 'private']);

// durationTypeに応じたバリデーションを行う関数
const validateBlockDuration = (block: { startHour: number; endHour: number; day: string }, durationType: 'normal' | 'normal' | 'weekly', ctx: z.RefinementCtx) => {
  const durationHours = block.endHour - block.startHour;
  const minDurationHours = 0.25; // 15分（最短）

  // 最短期間チェック
  if (durationHours < minDurationHours) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `各時間ブロックは最低15分必要です。`
    });
    return;
  }

  // durationTypeに応じた最長期間チェック
  if (durationType === 'normal') {
    // normalタイプ: 各Blockの期間制限はなし（最低0.25h、Routine全体が最低3時間）
    // ただし、Routine全体の時間範囲（例：8:00-12:00）内に収まる必要がある
    // このチェックはroutineSchema.superRefineで行う
    if (durationHours > 24) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `各ブロックは1日未満（24時間未満）である必要があります。`
      });
    }
  }
  // weeklyは期間制限なし（24時間超も許可）
};

const routineBlockCoreSchema = z
  .object({
    day: weekdaySchema,
    startHour: z.number().min(0), // 整数制限を解除（小数を許可）
    endHour: z.number().min(0.25), // 最低15分（0.25時間）
    label: z.string().min(3).max(80),
    objective: z.string().min(3).max(240),
    energyLevel: z.enum(['low', 'medium', 'high'])
  });

export const routineBlockSchema = routineBlockCoreSchema.extend({
  id: z.string().uuid()
});

export const routineBlockInputSchema = routineBlockCoreSchema.extend({
  id: z.string().uuid().optional()
});

export const routineSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(3).max(80),
    description: z.string().min(12).max(600),
    purpose: z.string().min(8).max(500),
    durationType: routineDurationSchema,
    visibility: routineVisibilitySchema,
    tags: z.array(z.string().min(2).max(30)).max(8).optional().default([]),
    owner: z.string().min(1),
    createdAt: z.date(),
    updatedAt: z.date(),
    version: z.number().int().min(1),
    timeBlocks: z.array(routineBlockSchema).min(1),
    // normalタイプの場合のみ必須: Routine全体の時間範囲（例：8:00-12:00）
    normalStartHour: z.number().min(0).max(24).optional(),
    normalEndHour: z.number().min(0).max(24).optional(),
    stats: z.object({
      clones: z.number().int().min(0), // Renamed from "forks" - clones are isolated copies, not linked to originals
      applications: z.number().int().min(0),
      likes: z.number().int().min(0)
    })
  })
  .superRefine((routine, ctx) => {
    // normalタイプの場合、時間範囲が必須
    if (routine.durationType === 'normal') {
      if (routine.normalStartHour === undefined || routine.normalEndHour === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'normalタイプでは、Routine全体の時間範囲（開始時刻と終了時刻）を設定してください。',
          path: ['normalStartHour']
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'normalタイプでは、Routine全体の時間範囲（開始時刻と終了時刻）を設定してください。',
          path: ['normalEndHour']
        });
      } else {
        // 時間範囲の妥当性チェック
        if (routine.normalEndHour <= routine.normalStartHour) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '終了時刻は開始時刻より後である必要があります。',
            path: ['normalEndHour']
          });
        }
        const timeRangeHours = routine.normalEndHour - routine.normalStartHour;
        if (timeRangeHours < 3) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Routine全体の時間範囲は最低3時間必要です。',
            path: ['normalEndHour']
          });
        }
        if (timeRangeHours > 24) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Routine全体の時間範囲は24時間未満である必要があります。',
            path: ['normalEndHour']
          });
        }
      }
    }

    // 各ブロックの期間バリデーション（durationTypeに応じた）
    routine.timeBlocks.forEach((block, index) => {
      validateBlockDuration(block, routine.durationType, ctx);

      // normalタイプの場合、すべてのBlockが時間範囲内に収まることを確認
      if (routine.durationType === 'normal' && routine.normalStartHour !== undefined && routine.normalEndHour !== undefined) {
        if (block.startHour < routine.normalStartHour || block.endHour > routine.normalEndHour) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `時間ブロックはRoutine全体の時間範囲（${routine.normalStartHour}:00-${routine.normalEndHour}:00）内に収まる必要があります。`,
            path: ['timeBlocks', index]
          });
        }
      }
    });

    // Routine全体の合計時間は最低3時間（180分）必要
    const totalHours = routine.timeBlocks.reduce((acc, block) => acc + (block.endHour - block.startHour), 0);
    if (totalHours < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Routine全体の合計時間は最低3時間必要です。',
        path: ['timeBlocks']
      });
    }

    // 時間ブロックの重複チェック
    const { hasOverlap, conflictingBlocks } = checkTimeBlockOverlaps(routine.timeBlocks);
    if (hasOverlap) {
      conflictingBlocks.forEach(({ index1, index2 }) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `時間ブロックが重複しています。同じ曜日の同じ時間帯に複数のブロックを配置することはできません。`,
          path: ['timeBlocks', index1]
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `時間ブロックが重複しています。同じ曜日の同じ時間帯に複数のブロックを配置することはできません。`,
          path: ['timeBlocks', index2]
        });
      });
    }
  });

// routineSchemaにsuperRefineがあるため、.omit()が使えない
// そのため、createRoutineSchemaを直接定義する
const routineBaseSchema = z.object({
  name: z.string().min(3, 'Nameは必須です（3文字以上）').max(80),
  description: z.string().min(12).max(600),
  purpose: z.string().min(8, '目的は必須です（8文字以上）').max(500),
  durationType: routineDurationSchema,
  visibility: routineVisibilitySchema,
  tags: z.array(z.string().min(2).max(30)).max(8).optional().default([]),
  owner: z.string().min(1),
  timeBlocks: z.array(routineBlockInputSchema).min(1, '時間ブロックは少なくとも1つ必要です'),
  // normalタイプの場合のみ必須
  normalStartHour: z.number().min(0).max(24).optional(),
  normalEndHour: z.number().min(0).max(24).optional()
});

// 時間ブロックの重複をチェックする関数
const checkTimeBlockOverlaps = (blocks: z.infer<typeof routineBlockInputSchema>[]): { hasOverlap: boolean; conflictingBlocks: Array<{ index1: number; index2: number }> } => {
  const conflicts: Array<{ index1: number; index2: number }> = [];

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const block1 = blocks[i];
      const block2 = blocks[j];

      // block1とblock2が存在することを確認
      if (!block1 || !block2) {
        continue;
      }

      // 同じ曜日で時間が重複しているかチェック
      if (block1.day === block2.day) {
        // 時間帯の重複判定: 同じ時間範囲、または時間が重複する場合
        // 1. 完全に同じ時間範囲: (start1 === start2 && end1 === end2)
        // 2. 部分的に重複: (start1 < end2 && end1 > start2)
        const isSameTimeRange = block1.startHour === block2.startHour && block1.endHour === block2.endHour;
        const hasTimeOverlap = block1.startHour < block2.endHour && block1.endHour > block2.startHour;
        if (isSameTimeRange || hasTimeOverlap) {
          conflicts.push({ index1: i, index2: j });
        }
      }
    }
  }

  return { hasOverlap: conflicts.length > 0, conflictingBlocks: conflicts };
};

export const createRoutineSchema = routineBaseSchema
  .extend({
    visibility: routineVisibilitySchema.default('private')
  })
  .superRefine((routine, ctx) => {
    // 時間ブロックが空の場合はエラー（既にmin(1)でチェックされているが、より明確なメッセージを提供）
    if (routine.timeBlocks.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '時間ブロックは少なくとも1つ必要です。',
        path: ['timeBlocks']
      });
      return; // 時間ブロックがない場合は他のチェックをスキップ
    }

    // 各ブロックの期間バリデーション（durationTypeに応じた）
    routine.timeBlocks.forEach((block, index) => {
      validateBlockDuration(block, routine.durationType, ctx);
    });

    // Routine全体の合計時間は最低3時間（180分）必要
    const totalHours = routine.timeBlocks.reduce((acc, block) => acc + (block.endHour - block.startHour), 0);
    if (totalHours < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Routine全体の合計時間は最低3時間必要です。',
        path: ['timeBlocks']
      });
    }

    // 時間ブロックの重複チェック
    const { hasOverlap, conflictingBlocks } = checkTimeBlockOverlaps(routine.timeBlocks);
    if (hasOverlap) {
      conflictingBlocks.forEach(({ index1, index2 }) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `時間ブロックが重複しています。同じ曜日の同じ時間帯に複数のブロックを配置することはできません。`,
          path: ['timeBlocks', index1]
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `時間ブロックが重複しています。同じ曜日の同じ時間帯に複数のブロックを配置することはできません。`,
          path: ['timeBlocks', index2]
        });
      });
    }
  });

// routineSchemaにsuperRefineがあるため、.omit()が使えない
// そのため、updateRoutineSchemaを直接定義する
export const updateRoutineSchema = z.object({
  id: z.string().uuid(),
  patch: routineBaseSchema
    .partial()
    .extend({
      stats: z
        .object({
          clones: z.number().int().min(0).optional(), // Renamed from "forks"
          applications: z.number().int().min(0).optional(),
          likes: z.number().int().min(0).optional()
        })
        .optional()
    })
});

export type Weekday = z.infer<typeof weekdaySchema>;
export type RoutineDuration = z.infer<typeof routineDurationSchema>;
export type RoutineVisibility = z.infer<typeof routineVisibilitySchema>;
export type RoutineBlock = z.infer<typeof routineBlockSchema>;
export type RoutineBlockInput = z.infer<typeof routineBlockInputSchema>;
export type Routine = z.infer<typeof routineSchema>;
export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;
export type UpdateRoutineInput = z.infer<typeof updateRoutineSchema>;

export type RoutineFilter = {
  tag?: string;
  duration?: RoutineDuration;
  visibility?: RoutineVisibility;
};

export const normalizeTags = (tags: string[]): string[] => {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => {
      if (!tag) return false;
      if (seen.has(tag)) {
        return false;
      }
      seen.add(tag);
      return true;
    });
};
