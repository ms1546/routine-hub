'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card } from '@/shared/ui/card';
import type { ActionResult } from '@/shared/types';
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
    const owner = String(formData.get('owner'));
    const name = String(formData.get('name'));

    startTransition(async () => {
      const result = await action({ routineId, owner, overrides: { name } });
      if (result.ok) {
        setStatus(`Forked as ${result.data?.name ?? 'routine'} (private)`);
      } else {
        setStatus(result.error ?? 'Unable to fork.');
      }
    });
  };

  return (
    <Card className="w-full border border-border/50 bg-card/40 p-4">
      <form className="flex w-full flex-wrap items-end gap-3" onSubmit={handleSubmit}>
        <Input
          type="text"
          name="name"
          placeholder={`${defaultName} - My Take`}
          defaultValue={`${defaultName} Clone`}
          required
          className="flex-1"
        />
        <Input type="email" name="owner" placeholder="you@example.com" required className="flex-1" />
        <Button type="submit" disabled={pending} className="mt-3">
          {pending ? 'Forking…' : 'Fork Routine'}
        </Button>
        <p className="text-sm text-muted-foreground">{status}</p>
      </form>
    </Card>
  );
}
