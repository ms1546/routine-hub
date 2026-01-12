'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

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

  return (
    <Card className="border border-border/60 bg-card/20 p-6" aria-busy={pending}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="tag-filter">Tag</Label>
          <select
            id="tag-filter"
            value={searchParams.get('tag') ?? ''}
            onChange={(event) => updateParam('tag', event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration-filter">Duration</Label>
          <select
            id="duration-filter"
            value={searchParams.get('duration') ?? ''}
            onChange={(event) => updateParam('duration', event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Any duration</option>
            <option value="half-day">Half-day</option>
            <option value="full-day">Full-day</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility-filter">Visibility</Label>
          <select
            id="visibility-filter"
            value={searchParams.get('visibility') ?? ''}
            onChange={(event) => updateParam('visibility', event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>
    </Card>
  );
}
