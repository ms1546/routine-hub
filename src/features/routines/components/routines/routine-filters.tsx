'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Card } from '@/shared/ui/card';
import { Label } from '@/shared/ui/label';

type RoutineFiltersProps = {
  availableTags: string[];
};

export function RoutineFilters({ availableTags }: RoutineFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    startTransition(() => {
      const next = params.toString();
      router.push(next ? `/routines?${next}` : '/routines');
    });
  };

  const selectClassName =
    'h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <Card className="p-4" aria-busy={pending}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="tag-filter">Tag</Label>
          <select id="tag-filter" value={searchParams.get('tag') ?? ''} onChange={(event) => updateParam('tag', event.target.value)} className={selectClassName}>
            <option value="">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration-filter">Duration</Label>
          <select id="duration-filter" value={searchParams.get('duration') ?? ''} onChange={(event) => updateParam('duration', event.target.value)} className={selectClassName}>
            <option value="">Any duration</option>
            <option value="half-day">Half-day</option>
            <option value="full-day">Full-day</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="visibility-filter">Visibility</Label>
          <select id="visibility-filter" value={searchParams.get('visibility') ?? ''} onChange={(event) => updateParam('visibility', event.target.value)} className={selectClassName}>
            <option value="">All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>
    </Card>
  );
}
