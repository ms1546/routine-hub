import { Badge } from '@/shared/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/shared/ui/card';
import { CalendarProposalPanel } from './calendar-proposal-panel';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { RoutineAiWorkflowResult } from '@/features/ai/types';
import type { RoutineDetailView, Routine } from '@/features/routines';
import type { RoutineInsight } from '@/features/ai/insights';
import type {
  ApplyRoutinePayload,
  ForkRoutinePayload,
  VisibilityTogglePayload
} from '@/features/routines/actions/routines';
import type { ActionResult } from '@/shared/types';
import type { RoutineApplicationPreview } from '@/features/calendar/domain/mock';
import { VisibilityToggleButton } from './visibility-toggle-button';
import { ApplyRoutineForm } from './apply-routine-form';
import { ForkRoutineForm } from './fork-routine-form';
import { StreamingWorkflowPanels } from './streaming-workflow-panels';

type AiAccessStatus = {
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  message?: string;
};

type CalendarPlanView = {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  isCalendarConnected: boolean;
  aiAccess: AiAccessStatus;
};

type RoutineDetailProps = {
  routine: RoutineDetailView;
  insights: RoutineInsight[];
  onToggleVisibility: (payload: VisibilityTogglePayload) => Promise<ActionResult<Routine>>;
  onApplyRoutine: (payload: ApplyRoutinePayload) => Promise<ActionResult<RoutineApplicationPreview>>;
  onForkRoutine: (payload: ForkRoutinePayload) => Promise<ActionResult<Routine>>;
  calendarPlan?: CalendarPlanView;
  workflow?: RoutineAiWorkflowResult | null;
};

export const RoutineDetail = ({
  routine,
  insights,
  onToggleVisibility,
  onApplyRoutine,
  onForkRoutine,
  calendarPlan,
  workflow
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

      {workflow === undefined ? null : workflow ? (
        <WorkflowPanels workflow={workflow} />
      ) : (
        <StreamingWorkflowPanels routineId={routine.id} initialWorkflow={null} />
      )}

      {workflow ? null : <InsightsPanel insights={insights} />}

      {calendarPlan ? (
        <section className="space-y-4" id="calendar">
          <h3 className="text-xl font-semibold">Calendar Planning</h3>
          <CalendarProposalPanel
            routineId={routine.id}
            proposedEvents={calendarPlan.proposedEvents}
            existingEvents={calendarPlan.existingEvents}
            isCalendarConnected={calendarPlan.isCalendarConnected}
            aiAccess={calendarPlan.aiAccess}
          />
        </section>
      ) : null}
    </div>
  );
};

const WorkflowPanels = ({ workflow }: { workflow: RoutineAiWorkflowResult }) => {
  return (
    <section className="space-y-4" id="ai-workflow">
      <h3 className="text-xl font-semibold">AI Workflow Output</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Profile summary</CardTitle>
            <CardDescription>{workflow.profile.agent}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="text-foreground">{workflow.profile.data.persona}</p>
            <div>
              <p className="text-xs uppercase tracking-wide">Constraints</p>
              <ul className="list-disc pl-5">
                {workflow.profile.data.highlightedConstraints.map((constraint, i) => (
                  <li key={i}>{constraint}</li>
                ))}
              </ul>
            </div>
            <p>Tone guidance: {workflow.profile.data.toneGuidance}</p>
          </CardContent>
        </Card>
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Routine interpretation</CardTitle>
            <CardDescription>{workflow.interpretation.agent}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="text-foreground">{workflow.interpretation.data.intent}</p>
            <div>
              <p className="text-xs uppercase tracking-wide">Success signals</p>
              <ul className="list-disc pl-5">
                {workflow.interpretation.data.successSignals.map((signal, i) => (
                  <li key={i}>{signal}</li>
                ))}
              </ul>
            </div>
            {workflow.interpretation.data.riskSignals.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide">Risk signals</p>
                <ul className="list-disc pl-5">
                  {workflow.interpretation.data.riskSignals.map((signal, i) => (
                    <li key={i}>{signal}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Conflicts</CardTitle>
            <CardDescription>{workflow.conflicts.agent}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {workflow.conflicts.data.conflicts.map((conflict) => (
              <div key={conflict.id} className="rounded-xl border border-border/40 bg-background/30 p-3">
                <p className="font-medium text-foreground">{conflict.label}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{conflict.severity}</p>
                <p>{conflict.rationale}</p>
              </div>
            ))}
            <div>
              <p className="text-xs uppercase tracking-wide">Assumptions</p>
              <ul className="list-disc pl-5">
                {workflow.conflicts.data.assumptions.map((assumption, i) => (
                  <li key={i}>{assumption}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Optimization proposals</CardTitle>
            <CardDescription>{workflow.optimizations.agent}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {workflow.optimizations.data.proposals.map((proposal) => (
              <div key={proposal.id} className="rounded-xl border border-border/40 bg-background/30 p-3">
                <p className="font-semibold text-foreground">{proposal.title}</p>
                <p>{proposal.description}</p>
                <p className="text-xs">Trade-offs: {proposal.tradeOffs.join(', ')}</p>
                <p className="text-[10px] uppercase tracking-wide">
                  {proposal.aiOnly ? 'AI-only suggestion' : 'Requires human execution'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Future simulation</CardTitle>
            <CardDescription>{workflow.futureSimulation.agent}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="text-foreground">{workflow.futureSimulation.data.outlook}</p>
            <div>
              <p className="text-xs uppercase tracking-wide">Guardrails</p>
              <ul className="list-disc pl-5">
                {workflow.futureSimulation.data.guardrails.map((guardrail, i) => (
                  <li key={i}>{guardrail}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide">Follow-up</p>
              <ul className="list-disc pl-5">
                {workflow.futureSimulation.data.followUpQuestions.map((question, i) => (
                  <li key={i}>{question}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Evaluation</CardTitle>
            <CardDescription>{workflow.evaluation.agent}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="text-foreground">Verdict: {workflow.evaluation.data.verdict}</p>
            <ul className="list-disc pl-5">
              <li>Clarity: {workflow.evaluation.data.clarity.score} ({workflow.evaluation.data.clarity.rationale})</li>
              <li>
                Consistency: {workflow.evaluation.data.consistency.score} ({workflow.evaluation.data.consistency.rationale})
              </li>
              <li>
                Explanation: {workflow.evaluation.data.explanationQuality.score} ({workflow.evaluation.data.explanationQuality.rationale})
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

const InsightsPanel = ({ insights }: { insights: RoutineInsight[] }) => {
  if (insights.length === 0) return null;
  return (
    <section className="space-y-4">
      <h3 className="text-xl font-semibold">Insights</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-2xl border border-border/40 bg-card/20 p-4 shadow-inner shadow-black/20">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">{insight.severity}</p>
            <p className="text-lg font-semibold text-foreground">{insight.title}</p>
            <p className="text-sm text-muted-foreground">{insight.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
