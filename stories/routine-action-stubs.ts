import type { ActionResult } from '@/shared/types/actionResult';
import type { Routine } from '@/features/routines';
import type { RoutineApplicationPreview } from '@/features/calendar/domain/mock';
import type {
  ApplyRoutinePayload,
  CloneRoutinePayload,
  VisibilityTogglePayload
} from '@/features/routines/actions/routines';

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
export const stubCloneRoutine = (_payload: CloneRoutinePayload) => ok<Routine>();
