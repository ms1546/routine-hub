'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { RoutineDetail } from './routine-detail';
import { RoutineDetailEditor } from './routine-detail-editor';
import type { RoutineDetailView } from '@/features/routines';
import type {
  ApplyRoutinePayload,
  CloneRoutinePayload,
  VisibilityTogglePayload,
  UpdateRoutineInfoPayload,
  UpdateBlockPayload,
  AddBlockPayload,
  DeleteBlockPayload,
  ReorderBlocksPayload,
  ToggleLikePayload
} from '@/features/routines/actions/routines';
import type { ActionResult } from '@/shared/types/actionResult';
import type { RoutineApplicationPreview } from '@/features/calendar/domain/mock';
import type { RoutineAiWorkflowResult } from '@/features/ai/types';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { Routine } from '@/features/routines';

type AiAccessStatus = {
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  message?: string;
};

type CalendarPlanView = {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  isCalendarConnected: boolean;
  aiAccess: AiAccessStatus;
};

type RoutineDetailWrapperProps = {
  routine: RoutineDetailView;
  ownerDisplayName?: string;
  onToggleVisibility: (payload: VisibilityTogglePayload) => Promise<ActionResult<Routine>>;
  onApplyRoutine: (payload: ApplyRoutinePayload) => Promise<ActionResult<RoutineApplicationPreview>>;
  onCloneRoutine: (payload: CloneRoutinePayload) => Promise<ActionResult<Routine>>;
  onUpdateRoutineInfo?: (payload: UpdateRoutineInfoPayload) => Promise<ActionResult<Routine>>;
  onUpdateBlock?: (payload: UpdateBlockPayload) => Promise<ActionResult<Routine>>;
  onAddBlock?: (payload: AddBlockPayload) => Promise<ActionResult<import('@/features/routines').RoutineBlock>>;
  onDeleteBlock?: (payload: DeleteBlockPayload) => Promise<ActionResult<Routine>>;
  onReorderBlocks?: (payload: ReorderBlocksPayload) => Promise<ActionResult<Routine>>;
  onToggleLike?: (payload: ToggleLikePayload) => Promise<ActionResult<{ liked: boolean; likes: number }>>;
  userId?: string;
  isLiked?: boolean;
  canEdit?: boolean;
  calendarPlan?: CalendarPlanView;
  workflow?: RoutineAiWorkflowResult | null;
};

export function RoutineDetailWrapper(props: RoutineDetailWrapperProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing && props.canEdit && props.onUpdateRoutineInfo && props.onUpdateBlock) {
    return (
      <RoutineDetailEditor
        routine={props.routine}
        onUpdateRoutineInfo={props.onUpdateRoutineInfo}
        onUpdateBlock={props.onUpdateBlock}
        onAddBlock={props.onAddBlock}
        onDeleteBlock={props.onDeleteBlock}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {props.canEdit && props.onUpdateRoutineInfo && props.onUpdateBlock && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            編集
          </Button>
        </div>
      )}
      <RoutineDetail {...props} onUpdateRoutineInfo={props.onUpdateRoutineInfo} />
    </div>
  );
}
