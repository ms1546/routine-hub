import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { RoutineListItem, Routine } from '@/lib/routines';
import type { VisibilityTogglePayload } from '@/app/actions/routines';
import type { ActionResult } from '@/lib/actions/types';
import { VisibilityToggleButton } from './visibility-toggle-button';

export type RoutineCardProps = {
  routine: RoutineListItem;
  onToggleVisibility: (payload: VisibilityTogglePayload) => Promise<ActionResult<Routine>>;
};

export const RoutineCard = ({ routine, onToggleVisibility }: RoutineCardProps) => {
  return (
    <Card className="flex h-full flex-col justify-between border-border/60 bg-card/30">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Badge className="bg-primary/15 text-primary" variant="outline">
              {routine.durationType}
            </Badge>
            <Badge variant={routine.visibility === 'public' ? 'default' : 'outline'}>{routine.visibility}</Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {routine.intensity}
            </Badge>
          </div>
          <VisibilityToggleButton
            routineId={routine.id}
            visibility={routine.visibility}
            action={onToggleVisibility}
          />
        </div>
        <div>
          <CardTitle className="text-2xl font-semibold text-foreground">{routine.name}</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">{routine.purpose}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {routine.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <dt className="uppercase tracking-wide text-xs">Total Hours</dt>
            <dd className="text-lg text-foreground">{routine.totalHours}h</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-xs">Blocks</dt>
            <dd className="text-lg text-foreground">{routine.blockCount}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-xs">Forks</dt>
            <dd className="text-lg text-foreground">{routine.stats.forks}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-xs">Applied</dt>
            <dd className="text-lg text-foreground">{routine.stats.applications}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3 border-t border-border/50">
        <Link className={buttonVariants()} href={`/routines/${routine.id}`}>
          View detail
        </Link>
        <Link className={buttonVariants({ variant: 'outline' })} href={`/routines/${routine.id}#blocks`}>
          View blocks
        </Link>
      </CardFooter>
    </Card>
  );
};
