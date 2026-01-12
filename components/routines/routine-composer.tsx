'use client';

import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActionResult } from '@/lib/actions/types';
import type { Routine } from '@/lib/routines';

const defaultBlock = {
  blockDay: 'monday',
  blockStartHour: 9,
  blockEndHour: 13,
  blockEnergy: 'high'
};

export type RoutineComposerProps = {
  action: (formData: FormData) => Promise<ActionResult<Routine>>;
};

export function RoutineComposer({ action }: RoutineComposerProps) {
  const [message, setMessage] = useState('Draft a quick routine to test the workflow.');
  const [pending, startTransition] = useTransition();
  const [blockState, setBlockState] = useState(defaultBlock);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        setMessage(`Created ${result.data?.name ?? 'routine'} and queued validation.`);
        formElement.reset();
        setBlockState(defaultBlock);
      } else {
        setMessage(result.error ?? 'Unable to create routine.');
      }
    });
  };

  return (
    <Card className="border border-border/60 bg-card/30">
      <CardHeader>
        <CardTitle className="text-xl">Compose a routine</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="routine-name">Name</Label>
              <Input name="name" id="routine-name" placeholder="Async Leadership Warm-up" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routine-purpose">Purpose</Label>
              <Input name="purpose" id="routine-purpose" placeholder="Clarify what success looks like" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="routine-description">Description</Label>
            <Textarea name="description" id="routine-description" placeholder="Explain the shape of this routine" required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="routine-tags">Tags</Label>
              <Input name="tags" id="routine-tags" placeholder="focus, leadership" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routine-owner">Owner Email</Label>
              <Input type="email" name="owner" id="routine-owner" placeholder="you@example.com" required />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="durationType">Duration</Label>
              <select
                name="durationType"
                id="durationType"
                defaultValue="weekly"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="half-day">Half-day</option>
                <option value="full-day">Full-day</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <select
                name="visibility"
                id="visibility"
                defaultValue="private"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="blockDay">Block Day</Label>
              <select
                name="blockDay"
                id="blockDay"
                value={blockState.blockDay}
                onChange={(event) => setBlockState((prev) => ({ ...prev, blockDay: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockStartHour">Start Hour</Label>
              <Input
                type="number"
                name="blockStartHour"
                id="blockStartHour"
                min={0}
                max={21}
                value={blockState.blockStartHour}
                onChange={(event) => setBlockState((prev) => ({ ...prev, blockStartHour: Number(event.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockEndHour">End Hour</Label>
              <Input
                type="number"
                name="blockEndHour"
                id="blockEndHour"
                min={3}
                max={24}
                value={blockState.blockEndHour}
                onChange={(event) => setBlockState((prev) => ({ ...prev, blockEndHour: Number(event.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockEnergy">Energy</Label>
              <select
                name="blockEnergy"
                id="blockEnergy"
                value={blockState.blockEnergy}
                onChange={(event) => setBlockState((prev) => ({ ...prev, blockEnergy: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="blockLabel">Block Label</Label>
              <Input name="blockLabel" id="blockLabel" placeholder="What happens in this block?" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockObjective">Block Objective</Label>
              <Input name="blockObjective" id="blockObjective" placeholder="Why does this block exist?" required />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/40 pt-6 text-sm text-muted-foreground">
            <Button type="submit" disabled={pending} className="w-full md:w-auto">
              {pending ? 'Creating…' : 'Create Routine'}
            </Button>
            <p>{message}</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
