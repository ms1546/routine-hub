'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/shared/ui/button';
import type { ActionResult } from '@/shared/types/actionResult';
import type { Routine } from '@/features/routines';
import type { VisibilityTogglePayload } from '@/features/routines/actions/routines';

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
  const [error, setError] = useState<string | null>(null);

  const nextVisibility = visibility === 'public' ? 'private' : 'public';

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await action({ routineId, visibility: nextVisibility });
      if (result.ok) {
        // 成功時は親で refresh される想定。必要ならトースト等を追加可能
      } else {
        setError(result.error ?? '公開設定の更新に失敗しました');
      }
    });
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" onClick={handleClick} disabled={pending} variant="secondary">
        {pending ? '更新中…' : (nextVisibility === 'public' ? '公開する' : '非公開にする')}
      </Button>
      {error && <span className="text-xs text-destructive" role="alert">{error}</span>}
    </span>
  );
}
