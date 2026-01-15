'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';

type ExecutionOption = {
  id: string;
  label: string;
  hasHumanEvaluation: boolean;
};

type HumanEvaluationFormProps = {
  executions: ExecutionOption[];
  action: (input: { executionId: string; score: number; comment: string }) => Promise<unknown>;
};

export function HumanEvaluationForm({ executions, action }: HumanEvaluationFormProps) {
  const [selectedId, setSelectedId] = useState(executions[0]?.id ?? '');
  const [score, setScore] = useState(4);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) {
      setStatus('Select an execution before submitting.');
      return;
    }
    startTransition(async () => {
      try {
        await action({ executionId: selectedId, score, comment });
        setStatus('Evaluation saved.');
        setComment('');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Failed to save evaluation.');
      }
    });
  };

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Human-in-the-loop</p>
        <h2 className="text-lg font-semibold mb-1">Add Evaluation</h2>
        <p className="text-sm text-muted-foreground">Judgments live only inside the admin console.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="execution-select">Execution</Label>
          <select
            id="execution-select"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {executions.length === 0 ? (
              <option value="" disabled>
                No executions available
              </option>
            ) : (
              executions.map((execution) => (
                <option key={execution.id} value={execution.id}>
                  {execution.label}
                  {execution.hasHumanEvaluation ? ' · reviewed' : ''}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="score">Score (1-5)</Label>
            <Input
              id="score"
              type="number"
              min={1}
              max={5}
              step="0.5"
              value={score}
              onChange={(event) => setScore(Number(event.target.value))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="comment">Comment</Label>
          <Textarea
            id="comment"
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Keep explanations short and reference observable behavior."
          />
        </div>
        <Button type="submit" disabled={pending || executions.length === 0}>
          {pending ? 'Saving…' : 'Record Evaluation'}
        </Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </form>
    </section>
  );
}
