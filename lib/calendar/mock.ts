import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Routine } from '@/lib/routines';

export const routineApplicationSchema = z
  .object({
    routineId: z.string().uuid(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
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
    idempotencyKey: `${routine.id}:${request.startDate}:${request.endDate}:${randomUUID()}`,
    routineId: routine.id,
    totalBlocks: routine.timeBlocks.length,
    totalHours,
    startDate: request.startDate,
    endDate: request.endDate,
    slots
  };
};
