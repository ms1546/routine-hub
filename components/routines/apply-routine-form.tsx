'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import type { ActionResult } from '@/lib/actions/types';
import type { RoutineApplicationPreview } from '@/lib/calendar/mock';
import type { ApplyRoutinePayload } from '@/app/actions/routines';

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
    <Card className="w-full border border-border/50 bg-card/40 p-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <Label htmlFor="startDate">Start</Label>
          <Input type="date" name="startDate" id="startDate" defaultValue={today()} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endDate">End</Label>
          <Input type="date" name="endDate" id="endDate" defaultValue={plusDays(7)} required />
        </div>
        <Button type="submit" disabled={pending} className="mt-5">
          {pending ? 'Simulating…' : 'Apply (Mock)'}
        </Button>
        <p className="text-sm text-muted-foreground">{status}</p>
      </form>
    </Card>
  );
}
