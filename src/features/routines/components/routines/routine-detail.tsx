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
  // Sort conflicts by severity (high -> medium -> low)
  const sortedConflicts = [...workflow.conflicts.data.conflicts].sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  return (
    <section className="space-y-6" id="ai-workflow">
      <h3 className="text-xl font-semibold">AI Workflow Analysis</h3>

      {/* Summary Section: Persona + Intent */}
      <Card className="border border-border/60 bg-card/30">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Persona</p>
            <p className="text-foreground">{workflow.profile.data.persona}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Intent</p>
            <p className="text-foreground">{workflow.interpretation.data.intent}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-border/40">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Key Constraints</p>
              <ul className="list-disc pl-5 space-y-1">
                {workflow.profile.data.highlightedConstraints.map((constraint, i) => (
                  <li key={i} className="text-muted-foreground">{constraint}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Success Signals</p>
              <ul className="list-disc pl-5 space-y-1">
                {workflow.interpretation.data.successSignals.map((signal, i) => (
                  <li key={i} className="text-muted-foreground">{signal}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues & Risks Section: Conflicts + Risk Signals */}
      {(sortedConflicts.length > 0 || workflow.interpretation.data.riskSignals.length > 0) && (
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Issues & Risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {sortedConflicts.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Conflicts</p>
                <div className="space-y-3">
                  {sortedConflicts.map((conflict) => (
                    <div key={conflict.id} className="rounded-xl border border-border/40 bg-background/30 p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-foreground">{conflict.label}</p>
                        <Badge
                          variant="outline"
                          className={
                            conflict.severity === 'high'
                              ? 'border-red-500/50 text-red-500'
                              : conflict.severity === 'medium'
                                ? 'border-yellow-500/50 text-yellow-500'
                                : 'border-blue-500/50 text-blue-500'
                          }
                        >
                          {conflict.severity}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{conflict.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {workflow.interpretation.data.riskSignals.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Risk Signals</p>
                <ul className="list-disc pl-5 space-y-1">
                  {workflow.interpretation.data.riskSignals.map((signal, i) => (
                    <li key={i} className="text-muted-foreground">{signal}</li>
                  ))}
                </ul>
              </div>
            )}
            {workflow.conflicts.data.assumptions.length > 0 && (
              <div className="pt-2 border-t border-border/40">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Assumptions</p>
                <ul className="list-disc pl-5 space-y-1">
                  {workflow.conflicts.data.assumptions.map((assumption, i) => (
                    <li key={i} className="text-muted-foreground">{assumption}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations Section: Optimization Proposals */}
      {workflow.optimizations.data.proposals.length > 0 && (
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {workflow.optimizations.data.proposals.map((proposal) => (
              <div key={proposal.id} className="rounded-xl border border-border/40 bg-background/30 p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-foreground">{proposal.title}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {proposal.aiOnly ? 'AI-only' : 'Human required'}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-2">{proposal.description}</p>
                {proposal.tradeOffs.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Trade-offs:</span> {proposal.tradeOffs.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Future Outlook Section */}
      <Card className="border border-border/60 bg-card/30">
        <CardHeader>
          <CardTitle>Future Outlook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Outlook</p>
            <p className="text-foreground">{workflow.futureSimulation.data.outlook}</p>
          </div>
          {workflow.futureSimulation.data.guardrails.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Guardrails</p>
              <ul className="list-disc pl-5 space-y-1">
                {workflow.futureSimulation.data.guardrails.map((guardrail, i) => (
                  <li key={i} className="text-muted-foreground">{guardrail}</li>
                ))}
              </ul>
            </div>
          )}
          {workflow.futureSimulation.data.followUpQuestions.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Follow-up Questions</p>
              <ul className="list-disc pl-5 space-y-1">
                {workflow.futureSimulation.data.followUpQuestions.map((question, i) => (
                  <li key={i} className="text-muted-foreground">{question}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Assessment Section */}
      <Card className="border border-border/60 bg-card/30">
        <CardHeader>
          <CardTitle>Quality Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Verdict</p>
            <Badge
              variant="outline"
              className={
                workflow.evaluation.data.verdict === 'approve'
                  ? 'border-green-500/50 text-green-500'
                  : 'border-yellow-500/50 text-yellow-500'
              }
            >
              {workflow.evaluation.data.verdict === 'approve' ? 'Approved' : 'Needs Revision'}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-3 pt-2 border-t border-border/40">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Clarity</p>
              <p className="text-foreground font-medium">{workflow.evaluation.data.clarity.score}/10</p>
              <p className="text-xs text-muted-foreground mt-1">{workflow.evaluation.data.clarity.rationale}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Consistency</p>
              <p className="text-foreground font-medium">{workflow.evaluation.data.consistency.score}/10</p>
              <p className="text-xs text-muted-foreground mt-1">{workflow.evaluation.data.consistency.rationale}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Explanation</p>
              <p className="text-foreground font-medium">{workflow.evaluation.data.explanationQuality.score}/10</p>
              <p className="text-xs text-muted-foreground mt-1">{workflow.evaluation.data.explanationQuality.rationale}</p>
            </div>
          </div>
        </CardContent>
      </Card>
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
