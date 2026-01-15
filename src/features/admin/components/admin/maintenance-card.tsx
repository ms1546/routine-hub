'use client';

import { useState, useTransition, type FormEvent } from 'react';
import type { MaintenanceState } from '@/infrastructure/system/maintenance';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';

type MaintenanceCardProps = {
  state: MaintenanceState;
  action: (input: { enabled: boolean; message?: string }) => Promise<MaintenanceState>;
};

export function MaintenanceCard({ state, action }: MaintenanceCardProps) {
  const [enabled, setEnabled] = useState(state.enabled);
  const [message, setMessage] = useState(state.message);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const updated = await action({ enabled, message });
        setNotice(updated.enabled ? 'Maintenance enabled.' : 'Maintenance disabled.');
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Failed to update maintenance state.');
      }
    });
  };

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Operations</p>
        <h2 className="text-lg font-semibold mb-1">Maintenance Mode</h2>
        <p className="text-sm text-muted-foreground">
          Communicate deliberate downtime. Users must never confuse this with generic errors.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex items-center gap-3">
          <input
            id="maintenance-toggle"
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="maintenance-toggle">Enable maintenance screen</Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maintenance-message">User-facing message</Label>
          <Textarea
            id="maintenance-message"
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Tell users why Routine Hub is temporarily unavailable."
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? 'Updating…' : 'Update maintenance state'}
        </Button>
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      </form>
    </section>
  );
}
