'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import type { ActionResult } from '@/shared/types/actionResult';
import type { Routine } from '@/features/routines';
import type { CloneRoutinePayload } from '@/features/routines/actions/routines';

type CloneRoutineFormProps = {
  routineId: string;
  defaultName: string;
  action: (payload: CloneRoutinePayload) => Promise<ActionResult<Routine>>;
};

/**
 * Clone Routine Form Component
 *
 * Allows users to create a personal copy (clone) of a public Routine.
 *
 * Key design decision:
 * - We use "clone" instead of "fork" because:
 *   1. Clones are personal, isolated copies (not linked to the original)
 *   2. The original Routine is never modified
 *   3. Unlike GitHub forks, there's no upstream relationship
 *
 * This aligns with Routine Hub's model where:
 * - Public Routines are reference templates
 * - Users create their own copy before editing or applying AI suggestions
 */
export function CloneRoutineForm({ routineId, defaultName, action }: CloneRoutineFormProps) {
  const [status, setStatus] = useState('Clone to personalize privately.');
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name'));

    startTransition(async () => {
      const result = await action({ routineId, overrides: { name } });
      if (result.ok) {
        setStatus(`Cloned as ${result.data?.name ?? 'routine'} (private)`);
      } else {
        setStatus(result.error ?? 'Unable to clone.');
      }
    });
  };

  return (
    <Card className="w-full p-4">
      <form className="flex w-full flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
        <div className="space-y-1.5 flex-1">
          <Label htmlFor="clone-name">Routine Name</Label>
          <Input
            type="text"
            name="name"
            id="clone-name"
            placeholder={`${defaultName} - My Take`}
            defaultValue={`${defaultName} Clone`}
            required
          />
        </div>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Cloning…' : 'Clone'}
        </Button>
      </form>
      {status && <p className="text-sm text-muted-foreground mt-2">{status}</p>}
    </Card>
  );
}
