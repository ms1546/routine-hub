'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { useStreamWorkflow } from '@/features/ai/hooks/use-stream-workflow';
import type { RoutineAiWorkflowResult } from '@/features/ai/types';

type StreamingWorkflowPanelsProps = {
  routineId: string;
  initialWorkflow: RoutineAiWorkflowResult | null;
};

export function StreamingWorkflowPanels({ routineId, initialWorkflow }: StreamingWorkflowPanelsProps) {
  const { workflow, partialWorkflow, currentStep, progressMessage, isLoading, error, startStream } = useStreamWorkflow(routineId);
  const [displayWorkflow, setDisplayWorkflow] = useState<RoutineAiWorkflowResult | null>(initialWorkflow);

  useEffect(() => {
    if (!initialWorkflow && !workflow && !isLoading) {
      startStream();
    }
  }, [initialWorkflow, workflow, isLoading, startStream]);

  useEffect(() => {
    if (workflow) {
      setDisplayWorkflow(workflow);
    } else if (partialWorkflow) {
      // Show partial workflow while streaming
      setDisplayWorkflow(null);
    }
  }, [workflow, partialWorkflow]);

  if (error) {
    return (
      <section className="space-y-2 rounded-2xl border border-dashed border-red-500/60 bg-card/10 p-4 text-sm text-red-500">
        <p className="text-xs uppercase tracking-[0.3em]">エラー</p>
        <p>{error}</p>
      </section>
    );
  }

  if (displayWorkflow) {
    return <WorkflowPanels workflow={displayWorkflow} />;
  }

  return (
    <section className="space-y-4" id="ai-workflow">
      <h3 className="text-xl font-semibold">AI Workflow Output</h3>
      <div className="space-y-2 rounded-2xl border border-dashed border-border/60 bg-card/10 p-4 text-sm text-muted-foreground">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">AI commentary</p>
        {progressMessage ? (
          <p>{progressMessage}</p>
        ) : (
          <p>AI コメントを生成しています。出力が確定するまで人が差分を確認してください。</p>
        )}
        {currentStep && (
          <div className="mt-2 text-xs">
            <p className="text-muted-foreground">現在のステップ: {getStepLabel(currentStep)}</p>
          </div>
        )}
      </div>
      {partialWorkflow && <PartialWorkflowPanels workflow={partialWorkflow} currentStep={currentStep} />}
    </section>
  );
}

function getStepLabel(step: string): string {
  const labels: Record<string, string> = {
    profile: 'プロフィール分析',
    interpretation: 'ルーチン解釈',
    conflicts: '衝突確認',
    optimizations: '最適化案生成',
    futureSimulation: '将来シミュレーション',
    evaluation: '評価実行'
  };
  return labels[step] || step;
}

function PartialWorkflowPanels({
  workflow,
  currentStep
}: {
  workflow: Partial<RoutineAiWorkflowResult>;
  currentStep: string | null;
}) {
  const hasAnyData =
    workflow.profile ||
    workflow.interpretation ||
    workflow.conflicts ||
    workflow.optimizations ||
    workflow.futureSimulation ||
    workflow.evaluation;

  if (!hasAnyData) {
    return null;
  }

  // Sort conflicts by severity if available
  const sortedConflicts = workflow.conflicts
    ? [...workflow.conflicts.data.conflicts].sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      {(workflow.profile || workflow.interpretation) && (
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            {currentStep && (currentStep === 'profile' || currentStep === 'interpretation') && (
              <CardDescription className="text-xs">生成中...</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {workflow.profile && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Persona</p>
                <p className="text-foreground">{workflow.profile.data.persona}</p>
              </div>
            )}
            {workflow.interpretation && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Intent</p>
                <p className="text-foreground">{workflow.interpretation.data.intent}</p>
              </div>
            )}
            {(workflow.profile?.data.highlightedConstraints.length || workflow.interpretation?.data.successSignals.length) && (
              <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-border/40">
                {workflow.profile?.data.highlightedConstraints.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Key Constraints</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {workflow.profile.data.highlightedConstraints.map((constraint, i) => (
                        <li key={i} className="text-muted-foreground">{constraint}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {workflow.interpretation?.data.successSignals.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Success Signals</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {workflow.interpretation.data.successSignals.map((signal, i) => (
                        <li key={i} className="text-muted-foreground">{signal}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Issues & Risks Section */}
      {(sortedConflicts.length > 0 ||
        workflow.interpretation?.data.riskSignals.length ||
        workflow.conflicts?.data.assumptions.length) && (
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Issues & Risks</CardTitle>
            {currentStep === 'conflicts' && <CardDescription className="text-xs">生成中...</CardDescription>}
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
            {workflow.interpretation?.data.riskSignals.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Risk Signals</p>
                <ul className="list-disc pl-5 space-y-1">
                  {workflow.interpretation.data.riskSignals.map((signal, i) => (
                    <li key={i} className="text-muted-foreground">{signal}</li>
                  ))}
                </ul>
              </div>
            )}
            {workflow.conflicts?.data.assumptions.length > 0 && (
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

      {/* Recommendations Section */}
      {workflow.optimizations?.data.proposals.length > 0 && (
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            {currentStep === 'optimizations' && <CardDescription className="text-xs">生成中...</CardDescription>}
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
      {workflow.futureSimulation && (
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Future Outlook</CardTitle>
            {currentStep === 'futureSimulation' && <CardDescription className="text-xs">生成中...</CardDescription>}
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
      )}

      {/* Quality Assessment Section */}
      {workflow.evaluation && (
        <Card className="border border-border/60 bg-card/30">
          <CardHeader>
            <CardTitle>Quality Assessment</CardTitle>
            {currentStep === 'evaluation' && <CardDescription className="text-xs">生成中...</CardDescription>}
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
      )}
    </div>
  );
}

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
