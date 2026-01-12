import type { ActionResult } from '@/lib/actions/types';
import type { Routine } from '@/lib/routines';
import type { RoutineApplicationPreview } from '@/lib/calendar/mock';
import type {
  ApplyRoutinePayload,
  ForkRoutinePayload,
  VisibilityTogglePayload
} from '@/app/actions/routines';

const ok = async <T>(data?: T): Promise<ActionResult<T>> => ({ ok: true, data });

export const stubCreateRoutine = () => ok<Routine>();
export const stubToggleVisibility = (_payload: VisibilityTogglePayload) => ok<Routine>();
export const stubApplyRoutine = (_payload: ApplyRoutinePayload) =>
  ok<RoutineApplicationPreview>({
    idempotencyKey: 'stub',
    routineId: 'story-routine',
    totalBlocks: 2,
    totalHours: 8,
    startDate: '2024-01-01',
    endDate: '2024-01-07',
    slots: []
  });
export const stubForkRoutine = (_payload: ForkRoutinePayload) => ok<Routine>();
