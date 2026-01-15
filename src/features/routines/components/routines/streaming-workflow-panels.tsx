'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/shared/ui/card';
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
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {workflow.profile && (
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
      )}
      {workflow.interpretation && (
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
      )}
      {workflow.conflicts && (
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
      )}
      {workflow.optimizations && (
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
      )}
      {workflow.futureSimulation && (
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
      )}
      {workflow.evaluation && (
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
      )}
    </div>
  );
}

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
