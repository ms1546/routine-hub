'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import type { ActionResult } from '@/shared/types/actionResult';
import type { Routine } from '@/features/routines';
import type { ForkRoutinePayload } from '@/features/routines/actions/routines';

type ForkRoutineFormProps = {
  routineId: string;
  defaultName: string;
  action: (payload: ForkRoutinePayload) => Promise<ActionResult<Routine>>;
};

export function ForkRoutineForm({ routineId, defaultName, action }: ForkRoutineFormProps) {
  const [status, setStatus] = useState('Fork to personalize privately.');
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name'));

    startTransition(async () => {
      const result = await action({ routineId, overrides: { name } });
      if (result.ok) {
        setStatus(`Forked as ${result.data?.name ?? 'routine'} (private)`);
      } else {
        setStatus(result.error ?? 'Unable to fork.');
      }
    });
  };

  return (
    <Card className="w-full p-4">
      <form className="flex w-full flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
        <div className="space-y-1.5 flex-1">
          <Label htmlFor="fork-name">Routine Name</Label>
          <Input
            type="text"
            name="name"
            id="fork-name"
            placeholder={`${defaultName} - My Take`}
            defaultValue={`${defaultName} Clone`}
            required
          />
        </div>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Forking…' : 'Fork'}
        </Button>
      </form>
      {status && <p className="text-sm text-muted-foreground mt-2">{status}</p>}
    </Card>
  );
}
