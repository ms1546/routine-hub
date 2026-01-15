import Link from 'next/link';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button-variants';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import type { RoutineListItem, Routine } from '@/features/routines';
import type { VisibilityTogglePayload } from '@/features/routines/actions/routines';
import type { ActionResult } from '@/shared/types/actionResult';
import { VisibilityToggleButton } from './visibility-toggle-button';

export type RoutineCardProps = {
  routine: RoutineListItem;
  onToggleVisibility: (payload: VisibilityTogglePayload) => Promise<ActionResult<Routine>>;
};

export const RoutineCard = ({ routine, onToggleVisibility }: RoutineCardProps) => {
  return (
    <Card className="group flex h-full flex-col fade-in-up hover-lift">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-xs">{routine.durationType}</Badge>
            <Badge variant={routine.visibility === 'public' ? 'default' : 'outline'} className="text-xs">
              {routine.visibility}
            </Badge>
            <Badge variant="outline" className="text-xs">{routine.intensity}</Badge>
          </div>
          <VisibilityToggleButton
            routineId={routine.id}
            visibility={routine.visibility}
            action={onToggleVisibility}
          />
        </div>
        <div className="mt-3">
          <CardTitle className="text-xl leading-tight">{routine.name}</CardTitle>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">{routine.purpose}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-5">
        {routine.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {routine.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Hours</dt>
            <dd className="text-lg font-semibold">{routine.totalHours}h</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Blocks</dt>
            <dd className="text-lg font-semibold">{routine.blockCount}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Forks</dt>
            <dd className="text-lg font-semibold">{routine.stats.forks}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Applied</dt>
            <dd className="text-lg font-semibold">{routine.stats.applications}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter>
        <Link
          className={buttonVariants({ variant: 'default', size: 'sm' })}
          href={`/routines/${routine.id}`}
        >
          View detail
        </Link>
        <Link
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          href={`/routines/${routine.id}#blocks`}
        >
          View blocks
        </Link>
      </CardFooter>
    </Card>
  );
};
