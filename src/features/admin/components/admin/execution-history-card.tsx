import type { ExecutionRecord } from '@/features/ai/execution-log';

type ExecutionHistoryCardProps = {
  records: ExecutionRecord[];
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString('en-US', { hour12: false });
};

export function ExecutionHistoryCard({ records }: ExecutionHistoryCardProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/30 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">AI Observability</p>
        <h2 className="text-2xl font-semibold text-foreground">Execution History</h2>
        <p className="text-sm text-muted-foreground">
          Metadata only – prompts, user inputs, and calendar data remain hidden.
        </p>
      </div>
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">No executions have been recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Workflow</th>
                <th className="px-3 py-2">Routine</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Judge</th>
                <th className="px-3 py-2">Human Eval</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-border/20 last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">{formatTimestamp(record.executedAt)}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{record.workflowName}</td>
                  <td className="px-3 py-2 text-foreground">{record.routineName}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        record.status === 'success'
                          ? 'text-emerald-500'
                          : 'text-destructive'
                      }
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {record.judgeScore ? (
                      <span className="text-foreground">
                        {record.judgeScore.toFixed(1)} · {record.judgeVerdict}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">n/a</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {record.hasHumanEvaluation ? (
                      <span className="text-primary">Yes</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
