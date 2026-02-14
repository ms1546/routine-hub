'use client';

import { useState, useTransition, type FormEvent } from 'react';
import type { MaintenanceState } from '@/infrastructure/system/maintenance';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';

type MaintenanceCardProps = {
  state: MaintenanceState;
  action: (input: { enabled: boolean; message?: string }) => Promise<MaintenanceState>;
};

export function MaintenanceCard({ state, action }: MaintenanceCardProps) {
  const [enabled, setEnabled] = useState(state.enabled);
  const [message, setMessage] = useState(state.message);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const updated = await action({ enabled, message });
        setNotice(updated.enabled ? 'メンテナンスモードを有効化しました。' : 'メンテナンスモードを無効化しました。');
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'メンテナンス状態の更新に失敗しました。');
      }
    });
  };

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">運用管理</p>
        <h2 className="text-lg font-semibold mb-1">メンテナンスモード</h2>
        <p className="text-sm text-muted-foreground">
          意図的なダウンタイムをユーザーに通知します。一般的なエラーと混同されることがないようにしてください。
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex items-center gap-3">
          <input
            id="maintenance-toggle"
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="maintenance-toggle">メンテナンス画面を有効化</Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maintenance-message">ユーザー向けメッセージ</Label>
          <Textarea
            id="maintenance-message"
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Routune Hubが一時的に利用できない理由をユーザーに伝えてください。"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? '更新中…' : 'メンテナンス状態を更新'}
        </Button>
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      </form>
    </section>
  );
}
