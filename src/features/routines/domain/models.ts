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

export const routineDurationSchema = z.enum(['half-day', 'full-day', 'weekly']);
export const routineVisibilitySchema = z.enum(['public', 'private']);

const routineBlockCoreSchema = z
  .object({
    day: weekdaySchema,
    startHour: z.number().int().min(0).max(21),
    endHour: z.number().int().min(3).max(24),
    label: z.string().min(3).max(80),
    objective: z.string().min(3).max(240),
    energyLevel: z.enum(['low', 'medium', 'high'])
  })
  .superRefine((block, ctx) => {
    // 各ブロックは最低156分（2.6時間）必要
    // 整数時間単位なので、実質的には3時間以上（endHour - startHour >= 3）
    const durationHours = block.endHour - block.startHour;
    if (durationHours < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '各時間ブロックは最低3時間（156分）必要です。'
      });
    }
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
    tags: z.array(z.string().min(2).max(30)).min(1).max(8),
    owner: z.string().min(1),
    createdAt: z.date(),
    updatedAt: z.date(),
    version: z.number().int().min(1),
    timeBlocks: z.array(routineBlockSchema).min(1),
    stats: z.object({
      forks: z.number().int().min(0),
      applications: z.number().int().min(0)
    })
  })
  .superRefine((routine, ctx) => {
    // Routine全体の合計時間は最低3時間（180分）必要
    const totalHours = routine.timeBlocks.reduce((acc, block) => acc + (block.endHour - block.startHour), 0);
    if (totalHours < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Routine全体の合計時間は最低3時間必要です。',
        path: ['timeBlocks']
      });
    }
  });

// routineSchemaにsuperRefineがあるため、.omit()が使えない
// そのため、createRoutineSchemaを直接定義する
const routineBaseSchema = z.object({
  name: z.string().min(3).max(80),
  description: z.string().min(12).max(600),
  purpose: z.string().min(8).max(500),
  durationType: routineDurationSchema,
  visibility: routineVisibilitySchema,
  tags: z.array(z.string().min(2).max(30)).min(1).max(8),
  owner: z.string().min(1),
  timeBlocks: z.array(routineBlockInputSchema).min(1)
});

export const createRoutineSchema = routineBaseSchema
  .extend({
    visibility: routineVisibilitySchema.default('private')
  })
  .superRefine((routine, ctx) => {
    // Routine全体の合計時間は最低3時間（180分）必要
    const totalHours = routine.timeBlocks.reduce((acc, block) => acc + (block.endHour - block.startHour), 0);
    if (totalHours < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Routine全体の合計時間は最低3時間必要です。',
        path: ['timeBlocks']
      });
    }
  });

// routineSchemaにsuperRefineがあるため、.omit()が使えない
// そのため、updateRoutineSchemaを直接定義する
export const updateRoutineSchema = z.object({
  id: z.string().uuid(),
  patch: routineBaseSchema.partial()
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
