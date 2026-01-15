'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import type { ActionResult } from '@/shared/types/actionResult';
import type { RoutineApplicationPreview } from '@/features/calendar/domain/mock';
import type { ApplyRoutinePayload } from '@/features/routines/actions/routines';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export function ApplyRoutineForm({
  routineId,
  action
}: {
  routineId: string;
  action: (payload: ApplyRoutinePayload) => Promise<ActionResult<RoutineApplicationPreview>>;
}) {
  const [status, setStatus] = useState('Pick a date range to simulate a calendar apply.');
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const startDate = String(formData.get('startDate'));
    const endDate = String(formData.get('endDate'));

    startTransition(async () => {
      const result = await action({ routineId, startDate, endDate });
      if (result.ok) {
        setStatus(`Preview ready · ${result.data?.totalBlocks ?? 0} blocks / ${result.data?.totalHours ?? 0}h window`);
      } else {
        setStatus(result.error ?? 'Could not apply routine.');
      }
    });
  };

  return (
    <Card className="w-full p-4">
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
        <div className="space-y-1.5 flex-1">
          <Label htmlFor="startDate">Start Date</Label>
          <Input type="date" name="startDate" id="startDate" defaultValue={today()} required />
        </div>
        <div className="space-y-1.5 flex-1">
          <Label htmlFor="endDate">End Date</Label>
          <Input type="date" name="endDate" id="endDate" defaultValue={plusDays(7)} required />
        </div>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Simulating…' : 'Apply'}
        </Button>
      </form>
      {status && <p className="text-sm text-muted-foreground mt-2">{status}</p>}
    </Card>
  );
}
