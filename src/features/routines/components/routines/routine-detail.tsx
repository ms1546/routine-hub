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
import type { ActionResult } from '@/shared/types/actionResult';
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
    <div className="space-y-8">
      <Card className="fade-in-up">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{routine.durationType}</Badge>
            <Badge variant="outline">{routine.intensity}</Badge>
            <Badge variant="outline">{routine.visibility}</Badge>
          </div>
          <div className="space-y-1">
            <CardTitle>{routine.name}</CardTitle>
            <CardDescription>{routine.description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <VisibilityToggleButton
              routineId={routine.id}
              visibility={routine.visibility}
              action={onToggleVisibility}
            />
            <ApplyRoutineForm routineId={routine.id} action={onApplyRoutine} />
            <ForkRoutineForm routineId={routine.id} defaultName={routine.name} action={onForkRoutine} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-6 md:grid-cols-4">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Owner</dt>
              <dd className="text-base font-semibold">{routine.owner}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</dt>
              <dd className="text-base font-semibold">{new Date(routine.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Updated</dt>
              <dd className="text-base font-semibold">{new Date(routine.updatedAt).toLocaleDateString()}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Hours</dt>
              <dd className="text-base font-semibold">{routine.totalHours}h</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <section id="blocks" className="space-y-6 section-bg p-6 rounded-xl">
        <div className="fade-in-up mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1 w-8 bg-foreground rounded-full"></div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">Time Blocks</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-10">Scheduled activities and their objectives</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {routine.timeBlocks.map((block, index) => (
            <Card
              key={block.id}
              className="hover-lift fade-in-up"
              style={{
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both'
              }}
            >
              <CardContent className="p-5">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="font-semibold text-lg">{block.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{block.objective}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Badge variant="outline" className="text-xs">{block.schedule}</Badge>
                    <Badge variant="outline" className="text-xs">{block.energyLevel}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
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
        <section className="space-y-6 section-bg p-6 rounded-xl" id="calendar">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1 w-8 bg-foreground rounded-full"></div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">Calendar Planning</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-10">Proposed schedule and conflict detection</p>
          </div>
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
    <section className="space-y-6 section-bg p-6" id="ai-workflow">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-8 bg-foreground rounded-full"></div>
          <h3 className="text-2xl font-bold tracking-tight text-foreground">AI Workflow Analysis</h3>
        </div>
        <p className="text-sm text-muted-foreground ml-10">Comprehensive analysis of routine compatibility and optimization</p>
      </div>

      {/* Summary Section: Persona + Intent */}
      <Card className="border-l-4 border-l-foreground">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Persona</p>
            <p>{workflow.profile.data.persona}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Intent</p>
            <p>{workflow.interpretation.data.intent}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 pt-3 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Key Constraints</p>
              <ul className="list-disc pl-5 space-y-0.5 text-sm">
                {workflow.profile.data.highlightedConstraints.map((constraint, i) => (
                  <li key={i} className="text-muted-foreground">{constraint}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Success Signals</p>
              <ul className="list-disc pl-5 space-y-0.5 text-sm">
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
        <Card className="border-l-4 border-l-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>⚠</span>
              Issues & Risks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedConflicts.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Conflicts</p>
                <div className="space-y-3">
                  {sortedConflicts.map((conflict) => {
                    const severityColors = {
                      high: 'border-l-foreground bg-muted',
                      medium: 'border-l-secondary bg-muted/50',
                      low: 'border-l-muted-foreground bg-muted/30'
                    };
                    return (
                      <div
                        key={conflict.id}
                        className={`rounded-md border-l-4 ${severityColors[conflict.severity]} border border-border/60 p-4 transition-all hover:shadow-md`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-sm">{conflict.label}</p>
                          <Badge
                            variant={conflict.severity === 'high' ? 'default' : 'outline'}
                            className={conflict.severity === 'high' ? 'bg-foreground text-background' : ''}
                          >
                            {conflict.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{conflict.rationale}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {workflow.interpretation.data.riskSignals.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Risk Signals</p>
                <ul className="list-disc pl-5 space-y-0.5 text-sm">
                  {workflow.interpretation.data.riskSignals.map((signal, i) => (
                    <li key={i} className="text-muted-foreground">{signal}</li>
                  ))}
                </ul>
              </div>
            )}
            {workflow.conflicts.data.assumptions.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1.5">Assumptions</p>
                <ul className="list-disc pl-5 space-y-0.5 text-sm">
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
        <Card className="border-l-4 border-l-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>💡</span>
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workflow.optimizations.data.proposals.map((proposal) => (
              <div key={proposal.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-medium text-sm">{proposal.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {proposal.aiOnly ? 'AI-only' : 'Human required'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1.5">{proposal.description}</p>
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
      <Card className="border-l-4 border-l-secondary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🔮</span>
            Future Outlook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Outlook</p>
            <p className="text-sm">{workflow.futureSimulation.data.outlook}</p>
          </div>
          {workflow.futureSimulation.data.guardrails.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Guardrails</p>
              <ul className="list-disc pl-5 space-y-0.5 text-sm">
                {workflow.futureSimulation.data.guardrails.map((guardrail, i) => (
                  <li key={i} className="text-muted-foreground">{guardrail}</li>
                ))}
              </ul>
            </div>
          )}
          {workflow.futureSimulation.data.followUpQuestions.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Follow-up Questions</p>
              <ul className="list-disc pl-5 space-y-0.5 text-sm">
                {workflow.futureSimulation.data.followUpQuestions.map((question, i) => (
                  <li key={i} className="text-muted-foreground">{question}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Assessment Section */}
      <Card className="border-l-4 border-l-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>✓</span>
            Quality Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Verdict</p>
            <Badge variant="outline">
              {workflow.evaluation.data.verdict === 'approve' ? 'Approved' : 'Needs Revision'}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-3 pt-3 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Clarity</p>
              <p className="font-medium">{workflow.evaluation.data.clarity.score}/10</p>
              <p className="text-xs text-muted-foreground mt-1">{workflow.evaluation.data.clarity.rationale}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Consistency</p>
              <p className="font-medium">{workflow.evaluation.data.consistency.score}/10</p>
              <p className="text-xs text-muted-foreground mt-1">{workflow.evaluation.data.consistency.rationale}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Explanation</p>
              <p className="font-medium">{workflow.evaluation.data.explanationQuality.score}/10</p>
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
    <section className="space-y-6 section-bg p-6 rounded-xl">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-8 bg-foreground rounded-full"></div>
          <h3 className="text-2xl font-bold tracking-tight text-foreground">Insights</h3>
        </div>
        <p className="text-sm text-muted-foreground ml-10">Key observations and recommendations</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((insight) => (
          <Card key={insight.title} className="transition-all duration-200 hover:border-accent/50">
            <CardContent className="p-5">
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs uppercase tracking-wider">
                  {insight.severity}
                </Badge>
                <h4 className="text-lg font-semibold">{insight.title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">{insight.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
