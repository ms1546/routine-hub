import Link from 'next/link';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button-variants';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import type { RoutineListItem, Routine } from '@/features/routines';
import type { VisibilityTogglePayload, ToggleLikePayload } from '@/features/routines/actions/routines';
import type { ActionResult } from '@/shared/types/actionResult';
import { VisibilityToggleButton } from './visibility-toggle-button';
import { LikeButton } from './like-button';
import { RoutineScheduleVisualizationCompact } from './routine-schedule-visualization-compact';
import { routinesRepository } from '@/features/routines';
import { getCurrentUser } from '@/infrastructure/auth/session';

export type RoutineCardProps = {
  routine: RoutineListItem;
  onToggleVisibility: (payload: VisibilityTogglePayload) => Promise<ActionResult<Routine>>;
  onToggleLike?: (payload: ToggleLikePayload) => Promise<ActionResult<{ liked: boolean; likes: number }>>;
  userId?: string;
  isLiked?: boolean;
};

export const RoutineCard = ({
  routine,
  onToggleVisibility,
  onToggleLike,
  userId,
  isLiked = false
}: RoutineCardProps) => {
  return (
    <Card className="flex h-full flex-col hover-lift">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">{routine.durationType}</Badge>
            <Badge variant={routine.visibility === 'public' ? 'primary' : 'outline'} className="text-xs">
              {routine.visibility}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {onToggleLike && userId && (
              <LikeButton
                routineId={routine.id}
                userId={userId}
                initialLikes={routine.stats.likes}
                initialLiked={isLiked}
                action={onToggleLike}
              />
            )}
            <VisibilityToggleButton
              routineId={routine.id}
              visibility={routine.visibility}
              action={onToggleVisibility}
            />
          </div>
        </div>
        <div className="mt-2">
          <CardTitle>{routine.name}</CardTitle>
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{routine.purpose}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {routine.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {routine.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* スケジュール可視化 - 直感的にRoutineの構成を理解できる */}
        {routine.timeBlocks && routine.timeBlocks.length > 0 && (
          <div className="py-2 border-t border-border/50 pt-4">
            <RoutineScheduleVisualizationCompact
              timeBlocks={routine.timeBlocks}
              durationType={routine.durationType}
            />
          </div>
        )}

        {/* 統計情報はコンパクトに表示 */}
        <dl className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50">
          <div className="text-center">
            <dt className="text-xs text-muted-foreground">Hours</dt>
            <dd className="text-sm font-semibold">{routine.totalHours}h</dd>
          </div>
          <div className="text-center">
            <dt className="text-xs text-muted-foreground">Blocks</dt>
            <dd className="text-sm font-semibold">{routine.blockCount}</dd>
          </div>
          <div className="text-center">
            <dt className="text-xs text-muted-foreground">Forks</dt>
            <dd className="text-sm font-semibold">{routine.stats.forks}</dd>
          </div>
          <div className="text-center">
            <dt className="text-xs text-muted-foreground">Likes</dt>
            <dd className="text-sm font-semibold">{routine.stats.likes}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="gap-2">
        <Link
          className={buttonVariants({ variant: 'default', size: 'sm' })}
          href={`/routines/${routine.id}`}
        >
          View detail
        </Link>
      </CardFooter>
    </Card>
  );
};
