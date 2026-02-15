'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { RoutineDetailEditor } from './routine-detail-editor';
import type { RoutineDetailView } from '@/features/routines';
import type { UpdateRoutineInfoPayload, UpdateBlockPayload } from '@/features/routines/actions/routines';
import type { ActionResult } from '@/shared/types/actionResult';
import type { Routine } from '@/features/routines';

type RoutineDetailEditButtonProps = {
  routine: RoutineDetailView;
  onUpdateRoutineInfo: (payload: UpdateRoutineInfoPayload) => Promise<ActionResult<Routine>>;
  onUpdateBlock: (payload: UpdateBlockPayload) => Promise<ActionResult<Routine>>;
  renderEditor: (onCancel: () => void) => React.ReactNode;
};

export function RoutineDetailEditButton({
  routine,
  onUpdateRoutineInfo,
  onUpdateBlock,
  renderEditor
}: RoutineDetailEditButtonProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <>
        {renderEditor(() => setIsEditing(false))}
      </>
    );
  }

  return (
    <Button variant="outline" onClick={() => setIsEditing(true)}>
      編集
    </Button>
  );
}
