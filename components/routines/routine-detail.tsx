import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import type { RoutineDetailView, Routine } from '@/lib/routines';
import type { RoutineInsight } from '@/lib/ai/insights';
import type {
  ApplyRoutinePayload,
  ForkRoutinePayload,
  VisibilityTogglePayload
} from '@/app/actions/routines';
import type { ActionResult } from '@/lib/actions/types';
import type { RoutineApplicationPreview } from '@/lib/calendar/mock';
import { VisibilityToggleButton } from './visibility-toggle-button';
import { ApplyRoutineForm } from './apply-routine-form';
import { ForkRoutineForm } from './fork-routine-form';

type RoutineDetailProps = {
  routine: RoutineDetailView;
  insights: RoutineInsight[];
  onToggleVisibility: (payload: VisibilityTogglePayload) => Promise<ActionResult<Routine>>;
  onApplyRoutine: (payload: ApplyRoutinePayload) => Promise<ActionResult<RoutineApplicationPreview>>;
  onForkRoutine: (payload: ForkRoutinePayload) => Promise<ActionResult<Routine>>;
};

export const RoutineDetail = ({
  routine,
  insights,
  onToggleVisibility,
  onApplyRoutine,
  onForkRoutine
}: RoutineDetailProps) => {
  return (
    <div className="space-y-10">
      <Card className="border border-border/60 bg-card/30">
        <CardHeader className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <Badge className="bg-primary/20 text-primary" variant="outline">
              {routine.durationType}
            </Badge>
            <Badge variant="outline">{routine.intensity}</Badge>
            <Badge variant="outline">{routine.visibility}</Badge>
          </div>
          <div className="space-y-2">
            <CardTitle>{routine.name}</CardTitle>
            <CardDescription>{routine.description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <VisibilityToggleButton
              routineId={routine.id}
              visibility={routine.visibility}
              action={onToggleVisibility}
            />
            <ApplyRoutineForm routineId={routine.id} action={onApplyRoutine} />
            <ForkRoutineForm routineId={routine.id} defaultName={routine.name} action={onForkRoutine} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner</p>
            <p className="text-lg text-foreground">{routine.owner}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
            <p className="text-lg text-foreground">{new Date(routine.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Updated</p>
            <p className="text-lg text-foreground">{new Date(routine.updatedAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Hours</p>
            <p className="text-lg text-foreground">{routine.totalHours}h</p>
          </div>
        </CardContent>
      </Card>

      <section id="blocks" className="space-y-4">
        <h3 className="text-xl font-semibold">Time Blocks</h3>
        <div className="space-y-3">
          {routine.timeBlocks.map((block) => (
            <div
              key={block.id}
              className="rounded-2xl border border-border/40 bg-card/30 p-4 shadow-inner shadow-black/20"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-medium text-foreground">{block.label}</p>
                  <p className="text-sm text-muted-foreground">{block.objective}</p>
                </div>
                <Badge variant="outline">{block.schedule}</Badge>
                <Badge variant="outline">{block.energyLevel} energy</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">AI Commentary (Mock)</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight) => (
            <div
              key={insight.title}
              className="rounded-2xl border border-border/40 bg-card/20 p-4 shadow-inner shadow-black/20"
            >
              <p className="text-sm uppercase tracking-wide text-muted-foreground">{insight.severity}</p>
              <p className="text-lg font-semibold text-foreground">{insight.title}</p>
              <p className="text-sm text-muted-foreground">{insight.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
