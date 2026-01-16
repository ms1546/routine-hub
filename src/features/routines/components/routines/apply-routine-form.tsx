'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import type { ActionResult } from '@/shared/types/actionResult';
import type { RoutineApplicationPreview } from '@/features/calendar/domain/mock';
import type { ApplyRoutinePayload } from '@/features/routines/actions/routines';
import type { RecurrencePattern } from '@/features/calendar/domain/types';

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
  const [status, setStatus] = useState('日付範囲を選択してカレンダーに適用します。');
  const [pending, startTransition] = useTransition();
  const [recurrenceType, setRecurrenceType] = useState<string>('none');
  const intervalContainerRef = useRef<HTMLDivElement>(null);
  const intervalDescriptionRef = useRef<HTMLSpanElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const startDate = String(formData.get('startDate'));
    const endDate = String(formData.get('endDate'));
    const recurrenceType = String(formData.get('recurrenceType'));
    const recurrenceInterval = formData.get('recurrenceInterval')
      ? Number(formData.get('recurrenceInterval'))
      : undefined;

    let recurrence: { type: 'none' } | { type: 'weekly'; interval: number } | { type: 'monthly'; interval: number } = { type: 'none' };
    if (recurrenceType === 'weekly') {
      recurrence = { type: 'weekly', interval: recurrenceInterval ?? 1 };
    } else if (recurrenceType === 'monthly') {
      recurrence = { type: 'monthly', interval: recurrenceInterval ?? 1 };
    }

    startTransition(async () => {
      const result = await action({ routineId, startDate, endDate, recurrence });
      if (result.ok) {
        setStatus(`Preview ready · ${result.data?.totalBlocks ?? 0} blocks / ${result.data?.totalHours ?? 0}h window`);
      } else {
        setStatus(result.error ?? 'Could not apply routine.');
      }
    });
  };

  useEffect(() => {
    if (intervalContainerRef.current && intervalDescriptionRef.current) {
      if (recurrenceType === 'weekly') {
        intervalContainerRef.current.style.display = 'block';
        intervalDescriptionRef.current.textContent = '毎週の場合、1=毎週、2=隔週、3=3週間ごと';
      } else if (recurrenceType === 'monthly') {
        intervalContainerRef.current.style.display = 'block';
        intervalDescriptionRef.current.textContent = '毎月の場合、1=毎月、2=隔月、3=3ヶ月ごと';
      } else {
        intervalContainerRef.current.style.display = 'none';
      }
    }
  }, [recurrenceType]);

  return (
    <Card className="w-full p-4">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="startDate">開始日</Label>
            <Input type="date" name="startDate" id="startDate" defaultValue={today()} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">終了日</Label>
            <Input type="date" name="endDate" id="endDate" defaultValue={plusDays(7)} required />
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="recurrenceType">繰り返し設定</Label>
            <select
              name="recurrenceType"
              id="recurrenceType"
              className="h-11 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring/50"
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value)}
            >
              <option value="none">繰り返さない（単発）</option>
              <option value="weekly">毎週</option>
              <option value="monthly">毎月</option>
            </select>
          </div>

          <div ref={intervalContainerRef} className="space-y-1.5" style={{ display: 'none' }}>
            <Label htmlFor="recurrenceInterval">間隔</Label>
            <Input
              type="number"
              name="recurrenceInterval"
              id="recurrenceInterval"
              min="1"
              max={recurrenceType === 'weekly' ? 52 : 12}
              defaultValue="1"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              <span ref={intervalDescriptionRef}>毎週の場合、1=毎週、2=隔週、3=3週間ごと</span>
            </p>
          </div>
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? '適用中…' : '適用'}
        </Button>
      </form>
      {status && <p className="text-sm text-muted-foreground mt-2">{status}</p>}
    </Card>
  );
}
