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
import { Button } from '@/shared/ui/button';
import { useStreamWorkflow } from '@/features/ai/hooks/use-stream-workflow';
import type { RoutineAiWorkflowResult } from '@/features/ai/types';

type StreamingWorkflowPanelsProps = {
  routineId: string;
  initialWorkflow: RoutineAiWorkflowResult | null;
  aiAccess?: {
    allowed: boolean;
    remaining: number | null;
    limit: number | null;
    message?: string;
  };
};

export function StreamingWorkflowPanels({ routineId, initialWorkflow, aiAccess }: StreamingWorkflowPanelsProps) {
  const { workflow, partialWorkflow, currentStep, progressMessage, streamingText, isLoading, error, startStream } = useStreamWorkflow(routineId);
  const [displayWorkflow, setDisplayWorkflow] = useState<RoutineAiWorkflowResult | null>(initialWorkflow);
  const [hasStarted, setHasStarted] = useState(!!initialWorkflow);

  // 自動実行を停止（ボタン押下時にstartStream()を呼び出す）
  const handleStartAnalysis = () => {
    if (!hasStarted && !isLoading) {
      setHasStarted(true);
      startStream();
    }
  };

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
      <section className="space-y-2 rounded-lg border border-dashed border-destructive p-3 text-sm text-destructive">
        <p className="text-xs">エラー</p>
        <p>{error}</p>
      </section>
    );
  }

  if (displayWorkflow) {
    return <WorkflowPanels workflow={displayWorkflow} />;
  }

  // AI Analysisボタン（まだ開始していない場合）
  if (!hasStarted && !isLoading && !error) {
    return (
      <section className="space-y-4" id="ai-workflow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">AI Analysis</h3>
            <p className="text-sm text-muted-foreground">Comprehensive routine compatibility analysis</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mx-auto mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">AI Analysisを実行して、Routineの適合性を分析します</p>
              {aiAccess && !aiAccess.allowed && (
                <p className="text-sm text-warning">{aiAccess.message}</p>
              )}
              {aiAccess && aiAccess.allowed && aiAccess.remaining !== null && (
                <p className="text-xs text-muted-foreground">残り実行可能回数: {aiAccess.remaining}回</p>
              )}
            </div>
            <Button
              onClick={handleStartAnalysis}
              disabled={!aiAccess?.allowed || isLoading}
              className="mt-4"
            >
              AI Analysisを実行
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4" id="ai-workflow">
      <h3 className="text-lg font-semibold">AI Workflow Analysis</h3>
      {streamingText ? (
        <Card>
          <CardContent className="p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {streamingText}
              {isLoading && <span className="animate-pulse">▊</span>}
            </pre>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <p className="text-xs text-muted-foreground mb-1">AI commentary</p>
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
      )}
      {partialWorkflow && !streamingText && <PartialWorkflowPanels workflow={partialWorkflow} currentStep={currentStep} />}
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
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            {currentStep && (currentStep === 'profile' || currentStep === 'interpretation') && (
              <CardDescription className="text-xs">生成中...</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {workflow.profile && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Persona</p>
                <p className="text-sm">{workflow.profile.data.persona}</p>
              </div>
            )}
            {workflow.interpretation && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Intent</p>
                <p className="text-sm">{workflow.interpretation.data.intent}</p>
              </div>
            )}
            {((workflow.profile?.data.highlightedConstraints?.length ?? 0) > 0 || (workflow.interpretation?.data.successSignals?.length ?? 0) > 0) && (
              <div className="grid gap-4 md:grid-cols-2 pt-3 border-t">
                {(workflow.profile?.data.highlightedConstraints?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Key Constraints</p>
                    <ul className="list-disc pl-5 space-y-0.5 text-sm">
                      {workflow.profile!.data.highlightedConstraints.map((constraint, i) => (
                        <li key={i} className="text-muted-foreground">{constraint}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(workflow.interpretation?.data.successSignals?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Success Signals</p>
                    <ul className="list-disc pl-5 space-y-0.5 text-sm">
                      {workflow.interpretation!.data.successSignals.map((signal, i) => (
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
        (workflow.interpretation?.data.riskSignals?.length ?? 0) > 0 ||
        (workflow.conflicts?.data.assumptions?.length ?? 0) > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Issues & Risks</CardTitle>
            {currentStep === 'conflicts' && <CardDescription className="text-xs">生成中...</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedConflicts.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Conflicts</p>
                <div className="space-y-2">
                  {sortedConflicts.map((conflict) => (
                    <div key={conflict.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm">{conflict.label}</p>
                        <Badge variant="outline">{conflict.severity}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{conflict.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(workflow.interpretation?.data.riskSignals?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Risk Signals</p>
                <ul className="list-disc pl-5 space-y-0.5 text-sm">
                  {workflow.interpretation!.data.riskSignals.map((signal, i) => (
                    <li key={i} className="text-muted-foreground">{signal}</li>
                  ))}
                </ul>
              </div>
            )}
            {(workflow.conflicts?.data.assumptions?.length ?? 0) > 0 && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1.5">Assumptions</p>
                <ul className="list-disc pl-5 space-y-0.5 text-sm">
                  {workflow.conflicts!.data.assumptions.map((assumption, i) => (
                    <li key={i} className="text-muted-foreground">{assumption}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations Section */}
      {(workflow.optimizations?.data.proposals?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            {currentStep === 'optimizations' && <CardDescription className="text-xs">生成中...</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-3">
            {workflow.optimizations!.data.proposals.map((proposal) => (
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
      {workflow.futureSimulation && (
        <Card>
          <CardHeader>
            <CardTitle>Future Outlook</CardTitle>
            {currentStep === 'futureSimulation' && <CardDescription className="text-xs">生成中...</CardDescription>}
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
      )}

      {/* Quality Assessment Section */}
      {workflow.evaluation && (
        <Card>
          <CardHeader>
            <CardTitle>Quality Assessment</CardTitle>
            {currentStep === 'evaluation' && <CardDescription className="text-xs">生成中...</CardDescription>}
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
      <h3 className="text-lg font-semibold">AI Workflow Analysis</h3>

      {/* Summary Section: Persona + Intent */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Persona</p>
            <p className="text-sm">{workflow.profile.data.persona}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Intent</p>
            <p className="text-sm">{workflow.interpretation.data.intent}</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Issues & Risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedConflicts.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Conflicts</p>
                <div className="space-y-2">
                  {sortedConflicts.map((conflict) => (
                    <div key={conflict.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm">{conflict.label}</p>
                        <Badge variant="outline">{conflict.severity}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{conflict.rationale}</p>
                    </div>
                  ))}
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
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle>Future Outlook</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle>Quality Assessment</CardTitle>
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
