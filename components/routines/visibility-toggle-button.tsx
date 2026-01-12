'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/lib/actions/types';
import type { Routine } from '@/lib/routines';
import type { VisibilityTogglePayload } from '@/app/actions/routines';

export function VisibilityToggleButton({
  routineId,
  visibility,
  action
}: {
  routineId: string;
  visibility: 'public' | 'private';
  action: (payload: VisibilityTogglePayload) => Promise<ActionResult<Routine>>;
}) {
  const [pending, startTransition] = useTransition();

  const nextVisibility = visibility === 'public' ? 'private' : 'public';

  const handleClick = () => {
    startTransition(async () => {
      await action({ routineId, visibility: nextVisibility });
    });
  };

  return (
    <Button type="button" onClick={handleClick} disabled={pending} variant="secondary">
      {pending ? 'Updating…' : `Make ${nextVisibility}`}
    </Button>
  );
}
