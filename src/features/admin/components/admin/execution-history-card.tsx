import type { ExecutionRecord } from '@/features/ai/execution-log';

type ExecutionHistoryCardProps = {
  records: ExecutionRecord[];
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString('ja-JP', { hour12: false });
};

export function ExecutionHistoryCard({ records }: ExecutionHistoryCardProps) {
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">AI可観測性</p>
        <h2 className="text-lg font-semibold mb-1">実行履歴</h2>
        <p className="text-sm text-muted-foreground">
          メタデータのみ表示 – プロンプト、ユーザー入力、カレンダーデータは非表示です。
        </p>
      </div>
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">実行記録はまだありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">実行時刻</th>
                <th className="px-3 py-2">ワークフロー</th>
                <th className="px-3 py-2">Routine</th>
                <th className="px-3 py-2">ステータス</th>
                <th className="px-3 py-2">Judge評価</th>
                <th className="px-3 py-2">人間評価</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b last:border-0">
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
                      {record.status === 'success' ? '成功' : '失敗'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {record.judgeScore ? (
                      <span className="text-foreground">
                        {record.judgeScore.toFixed(1)} · {record.judgeVerdict}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">未評価</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {record.hasHumanEvaluation ? (
                      <span className="text-primary">あり</span>
                    ) : (
                      <span className="text-muted-foreground">なし</span>
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
