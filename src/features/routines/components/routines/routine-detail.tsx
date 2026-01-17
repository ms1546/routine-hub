import { Badge } from '@/shared/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/shared/ui/card';
import { CalendarProposalPanel } from './calendar-proposal-panel';
import { RoutineBlockEditor } from './routine-block-editor';
import { RoutineScheduleVisualization } from './routine-schedule-visualization';
import { LikeButton } from './like-button';
import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import type { RoutineAiWorkflowResult } from '@/features/ai/types';
import type { RoutineDetailView, Routine } from '@/features/routines';
import type { RoutineInsight } from '@/features/ai/insights';
import type {
  ApplyRoutinePayload,
  ForkRoutinePayload,
  VisibilityTogglePayload,
  UpdateBlockPayload,
  DeleteBlockPayload,
  ReorderBlocksPayload,
  ToggleLikePayload
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
  onUpdateBlock?: (payload: UpdateBlockPayload) => Promise<ActionResult<Routine>>;
  onDeleteBlock?: (payload: DeleteBlockPayload) => Promise<ActionResult<Routine>>;
  onReorderBlocks?: (payload: ReorderBlocksPayload) => Promise<ActionResult<Routine>>;
  onToggleLike?: (payload: ToggleLikePayload) => Promise<ActionResult<{ liked: boolean; likes: number }>>;
  userId?: string;
  isLiked?: boolean;
  canEdit?: boolean;
  calendarPlan?: CalendarPlanView;
  workflow?: RoutineAiWorkflowResult | null;
};

export const RoutineDetail = ({
  routine,
  insights,
  onToggleVisibility,
  onApplyRoutine,
  onForkRoutine,
  onUpdateBlock,
  onDeleteBlock,
  onReorderBlocks,
  onToggleLike,
  userId,
  isLiked = false,
  canEdit = false,
  calendarPlan,
  workflow
}: RoutineDetailProps) => {
  return (
    <div className="space-y-6">
      <Card className="fade-in-up">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <Badge variant="secondary">{routine.durationType}</Badge>
            <Badge variant="secondary">{routine.intensity}</Badge>
            <Badge variant={routine.visibility === 'public' ? 'primary' : 'outline'}>{routine.visibility}</Badge>
          </div>
          <CardTitle className="text-2xl">{routine.name}</CardTitle>
          <CardDescription className="text-base">{routine.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <dt className="text-xs text-muted-foreground mb-1">Owner</dt>
              <dd className="font-medium truncate">{routine.owner}</dd>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <dt className="text-xs text-muted-foreground mb-1">Created</dt>
              <dd className="font-medium">{new Date(routine.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <dt className="text-xs text-muted-foreground mb-1">Updated</dt>
              <dd className="font-medium">{new Date(routine.updatedAt).toLocaleDateString()}</dd>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <dt className="text-xs text-muted-foreground mb-1">Total Hours</dt>
              <dd className="font-medium">{routine.totalHours}h</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
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
            <ApplyRoutineForm routineId={routine.id} action={onApplyRoutine} />
            <ForkRoutineForm routineId={routine.id} defaultName={routine.name} action={onForkRoutine} />
          </div>
        </CardContent>
      </Card>

      <section id="blocks" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Time Blocks</h2>
            <p className="text-sm text-muted-foreground">Scheduled activities and their objectives</p>
          </div>
          <Badge variant="secondary">{routine.timeBlocks.length} blocks</Badge>
        </div>
        <Card className="p-6">
          <RoutineScheduleVisualization
            timeBlocks={routine.timeBlocks}
            durationType={routine.durationType}
          />
        </Card>
        {onUpdateBlock && onDeleteBlock && onReorderBlocks ? (
          <RoutineBlockEditor
            routine={routine}
            onUpdateBlock={onUpdateBlock}
            onDeleteBlock={onDeleteBlock}
            onReorderBlocks={onReorderBlocks}
            canEdit={canEdit}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {routine.timeBlocks.map((block) => (
              <Card key={block.id} className="hover-lift">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="font-medium">{block.label}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{block.objective}</p>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <Badge variant="outline" className="text-xs">{block.schedule}</Badge>
                      <Badge variant={block.energyLevel === 'high' ? 'warning' : 'secondary'} className="text-xs">
                        {block.energyLevel}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {workflow === undefined ? null : workflow ? (
        <WorkflowPanels workflow={workflow} />
      ) : (
        <StreamingWorkflowPanels routineId={routine.id} initialWorkflow={null} />
      )}

      {workflow ? null : <InsightsPanel insights={insights} />}

      {calendarPlan ? (
        <section className="space-y-4" id="calendar">
          <div>
            <h2 className="text-xl font-semibold">Calendar Planning</h2>
            <p className="text-sm text-muted-foreground">Proposed schedule and conflict detection</p>
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
    <section className="space-y-4" id="ai-workflow">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold">AI Analysis</h2>
          <p className="text-sm text-muted-foreground">Comprehensive routine compatibility analysis</p>
        </div>
      </div>

      {/* Summary Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-3 bg-accent/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Persona</p>
              <p className="text-sm">{workflow.profile.data.persona}</p>
            </div>
            <div className="p-3 bg-accent/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Intent</p>
              <p className="text-sm">{workflow.interpretation.data.intent}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Key Constraints</p>
              <ul className="space-y-1">
                {workflow.profile.data.highlightedConstraints.map((constraint, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {constraint}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Success Signals</p>
              <ul className="space-y-1">
                {workflow.interpretation.data.successSignals.map((signal, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-success mt-1">✓</span>
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues & Risks Section */}
      {(sortedConflicts.length > 0 || workflow.interpretation.data.riskSignals.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-warning">⚠</span>
              Issues & Risks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedConflicts.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Conflicts</p>
                <div className="space-y-2">
                  {sortedConflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      className="rounded-lg border p-3 bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm">{conflict.label}</p>
                        <Badge
                          variant={conflict.severity === 'high' ? 'destructive' : conflict.severity === 'medium' ? 'warning' : 'secondary'}
                        >
                          {conflict.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{conflict.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {workflow.interpretation.data.riskSignals.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Risk Signals</p>
                <ul className="space-y-1">
                  {workflow.interpretation.data.riskSignals.map((signal, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-destructive mt-1">•</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {workflow.conflicts.data.assumptions.length > 0 && (
              <div className="pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Assumptions</p>
                <ul className="space-y-1">
                  {workflow.conflicts.data.assumptions.map((assumption, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-muted-foreground/50 mt-1">•</span>
                      {assumption}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations Section */}
      {workflow.optimizations.data.proposals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-primary">💡</span>
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workflow.optimizations.data.proposals.map((proposal) => (
              <div key={proposal.id} className="rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-medium text-sm">{proposal.title}</p>
                  <Badge variant={proposal.aiOnly ? 'primary' : 'outline'} className="text-xs">
                    {proposal.aiOnly ? 'AI-only' : 'Human required'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{proposal.description}</p>
                {proposal.tradeOffs.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                    <span className="font-medium">Trade-offs:</span> {proposal.tradeOffs.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Future Outlook Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>🔮</span>
            Future Outlook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-accent/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Outlook</p>
            <p className="text-sm">{workflow.futureSimulation.data.outlook}</p>
          </div>
          {workflow.futureSimulation.data.guardrails.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Guardrails</p>
              <ul className="space-y-1">
                {workflow.futureSimulation.data.guardrails.map((guardrail, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-warning mt-1">⚡</span>
                    {guardrail}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {workflow.futureSimulation.data.followUpQuestions.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Follow-up Questions</p>
              <ul className="space-y-1">
                {workflow.futureSimulation.data.followUpQuestions.map((question, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">?</span>
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Assessment Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-success">✓</span>
              Quality Assessment
            </CardTitle>
            <Badge variant={workflow.evaluation.data.verdict === 'approve' ? 'success' : 'warning'}>
              {workflow.evaluation.data.verdict === 'approve' ? 'Approved' : 'Needs Revision'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{workflow.evaluation.data.clarity.score}/10</p>
              <p className="text-xs text-muted-foreground mt-1">Clarity</p>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{workflow.evaluation.data.clarity.rationale}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{workflow.evaluation.data.consistency.score}/10</p>
              <p className="text-xs text-muted-foreground mt-1">Consistency</p>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{workflow.evaluation.data.consistency.rationale}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{workflow.evaluation.data.explanationQuality.score}/10</p>
              <p className="text-xs text-muted-foreground mt-1">Explanation</p>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{workflow.evaluation.data.explanationQuality.rationale}</p>
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
      <div>
        <h2 className="text-xl font-semibold">Insights</h2>
        <p className="text-sm text-muted-foreground">Key observations and recommendations</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight) => (
          <Card key={insight.title} className="hover-lift">
            <CardContent className="p-4">
              <div className="space-y-2">
                <Badge
                  variant={insight.severity === 'warning' ? 'warning' : insight.severity === 'success' ? 'success' : 'secondary'}
                  className="text-xs"
                >
                  {insight.severity}
                </Badge>
                <h4 className="font-medium">{insight.title}</h4>
                <p className="text-sm text-muted-foreground">{insight.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
