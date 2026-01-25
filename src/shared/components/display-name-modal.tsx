'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSession } from '@/shared/hooks/use-session';
import { Modal } from '@/shared/ui/modal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { updateUserSettingsAction } from '@/app/actions/user-settings';

type DisplayNameModalProps = {
  open: boolean;
  userId: string;
  initialDisplayName?: string;
  onComplete: () => void;
};

export function DisplayNameModal({ open, userId, initialDisplayName, onComplete }: DisplayNameModalProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { update: updateSession } = useSession();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setDisplayName(initialDisplayName ?? '');
      setError(null);
    }
  }, [open, initialDisplayName]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateUserSettingsAction({
          displayName: displayName.trim()
        });
        if (result.ok) {
          // セッションを更新して表示名を反映
          await updateSession();
          onComplete();
        } else {
          setError(result.error ?? '設定の保存に失敗しました');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={() => {}} // 初回ログイン時は閉じられない
      title="表示名を設定"
      size="md"
      footer={
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={pending || !displayName.trim()}>
            {pending ? '保存中…' : '保存して続ける'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            初回ログインです。他のユーザーに表示される名前を設定してください。
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">表示名</Label>
          <Input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setError(null);
            }}
            placeholder="あなたの表示名"
            maxLength={80}
            required
            autoFocus
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">後で設定ページから変更できます</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </form>
    </Modal>
  );
}
