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
import type { ProposedCalendarEvent, CalendarEvent } from '@/lib/calendar/types';
import { CalendarProposalPanel } from './calendar-proposal-panel';
import { VisibilityToggleButton } from './visibility-toggle-button';
import { ApplyRoutineForm } from './apply-routine-form';
import { ForkRoutineForm } from './fork-routine-form';
import { RoutineBlockTimeline } from './routine-block-timeline';
import { getMockUserProfile } from '@/lib/auth/user-directory';

type RoutineDetailProps = {
  routine: RoutineDetailView;
  insights: RoutineInsight[];
  onToggleVisibility: (payload: VisibilityTogglePayload) => Promise<ActionResult<Routine>>;
  onApplyRoutine: (payload: ApplyRoutinePayload) => Promise<ActionResult<RoutineApplicationPreview>>;
  onForkRoutine: (payload: ForkRoutinePayload) => Promise<ActionResult<Routine>>;
  calendarPlan: {
    proposedEvents: ProposedCalendarEvent[];
    existingEvents: CalendarEvent[];
  };
};

export const RoutineDetail = ({
  routine,
  insights,
  onToggleVisibility,
  onApplyRoutine,
  onForkRoutine,
  calendarPlan
}: RoutineDetailProps) => {
  return (
    <div className="space-y-10">
      {(() => {
        const ownerProfile = getMockUserProfile(routine.owner);
        return (
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
                <p className="text-lg text-foreground">{ownerProfile.displayName}</p>
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
        );
      })()}

      <section id="blocks" className="space-y-4">
        <h3 className="text-xl font-semibold">Time Blocks</h3>
        <RoutineBlockTimeline blocks={routine.timeBlocks} />
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

      <CalendarProposalPanel
        routineId={routine.id}
        proposedEvents={calendarPlan.proposedEvents}
        existingEvents={calendarPlan.existingEvents}
      />
    </div>
  );
};
