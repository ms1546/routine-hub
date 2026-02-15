import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';
import { z } from 'zod';
import type { Routine } from '@/features/routines';

const generateUUID = createDefaultUUIDGenerator();

export const recurrencePatternSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('weekly'), interval: z.number().int().min(1).max(52).optional().default(1) }),
  z.object({ type: z.literal('monthly'), interval: z.number().int().min(1).max(12).optional().default(1) })
]);

export const routineApplicationSchema = z
  .object({
    routineId: z.string().uuid(),
    startDate: z.string().regex(/\d{4}-\d{2}-\d{2}/, 'Invalid ISO date (YYYY-MM-DD)'),
    endDate: z.string().regex(/\d{4}-\d{2}-\d{2}/, 'Invalid ISO date (YYYY-MM-DD)'),
    recurrence: recurrencePatternSchema.optional().default({ type: 'none' })
  })
  .refine((value) => new Date(value.startDate) <= new Date(value.endDate), {
    message: 'startDate must be before or equal to endDate'
  });

export type RoutineApplicationRequest = z.infer<typeof routineApplicationSchema>;

export type RoutineApplicationPreview = {
  idempotencyKey: string;
  routineId: string;
  totalBlocks: number;
  totalHours: number;
  startDate: string;
  endDate: string;
  slots: Array<{
    dayLabel: string;
    label: string;
    startHour: number;
    endHour: number;
    energyLevel: string;
  }>;
};

const dayLabelMap: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

export const buildRoutinePreview = (
  routine: Routine,
  request: RoutineApplicationRequest
): RoutineApplicationPreview => {
  const slots = routine.timeBlocks.map((block) => ({
    dayLabel: dayLabelMap[block.day] ?? block.day,
    label: block.label,
    startHour: block.startHour,
    endHour: block.endHour,
    energyLevel: block.energyLevel
  }));

  const totalHours = routine.timeBlocks.reduce((acc, block) => acc + (block.endHour - block.startHour), 0);

  return {
    idempotencyKey: `${routine.id}:${request.startDate}:${request.endDate}:${generateUUID()}`,
    routineId: routine.id,
    totalBlocks: routine.timeBlocks.length,
    totalHours,
    startDate: request.startDate,
    endDate: request.endDate,
    slots
  };
};
