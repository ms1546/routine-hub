'use client';

import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Modal } from '@/shared/ui/modal';
import type { ActionResult } from '@/shared/types/actionResult';
import type { Routine, RoutineBlockInput } from '@/features/routines';
import { RoutineBlockTimelineEditor } from './routine-block-timeline-editor';

export type RoutineComposerProps = {
  action: (formData: FormData) => Promise<ActionResult<Routine>>;
  asModal?: boolean; // モーダルとして表示するか
  open?: boolean; // モーダルの開閉状態（asModal=trueの場合）
  onClose?: () => void; // モーダルを閉じるコールバック（asModal=trueの場合）
  userEmail?: string; // ユーザーのメールアドレス（オーナーとして自動設定）
};

export function RoutineComposer({ action, asModal = false, open = false, onClose, userEmail }: RoutineComposerProps) {
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [durationType, setDurationType] = useState<'half-day' | 'full-day' | 'weekly'>('weekly');
  const [blocks, setBlocks] = useState<RoutineBlockInput[]>([]);
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    // userEmailが指定されている場合は自動設定
    if (userEmail) {
      formData.set('owner', userEmail);
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        setMessage(`Routine「${result.data?.name ?? ''}」を作成しました`);
        formElement.reset();

        // デフォルトブロックにリセット（空の配列）
        setBlocks([]);
        setDurationType('weekly');

        // モーダルの場合は少し待ってから閉じる
        if (asModal && onClose) {
          setTimeout(() => {
            onClose();
            setMessage('');
            router.refresh(); // ページをリフレッシュして最新の状態を取得
          }, 1000);
        } else {
          router.refresh();
        }
      } else {
        setMessage(result.error ?? 'Routineの作成に失敗しました');
      }
    });
  };

  const selectClassName =
    'relative h-11 w-full rounded-lg border border-input/60 bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring/50 focus-visible:shadow-lg focus-visible:shadow-ring/20';

  const formContent = (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="routine-name">Name</Label>
          <Input name="name" id="routine-name" placeholder="Async Leadership Warm-up" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="routine-purpose">目的</Label>
          <Input name="purpose" id="routine-purpose" placeholder="Clarify what success looks like" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="routine-description">Description</Label>
        <Textarea name="description" id="routine-description" placeholder="Explain the shape of this routine" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="routine-tags">Tags</Label>
        <Input name="tags" id="routine-tags" placeholder="focus, leadership" required />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2.5">
          <Label htmlFor="durationType">Duration</Label>
          <select
            name="durationType"
            id="durationType"
            value={durationType}
            onChange={(e) => setDurationType(e.target.value as 'half-day' | 'full-day' | 'weekly')}
            className={selectClassName}
          >
            <option value="half-day">Half-day</option>
            <option value="full-day">Full-day</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="visibility">Visibility</Label>
          <select name="visibility" id="visibility" defaultValue="private" className={selectClassName}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      {/* ビジュアルタイムライン編集 */}
      <RoutineBlockTimelineEditor
        blocks={blocks}
        onChange={setBlocks}
        durationType={durationType}
      />

      <div className="flex flex-col gap-4 border-t border-border/50 pt-6">
        <Button type="submit" disabled={pending} className="w-full md:w-auto">
          {pending ? '作成中...' : 'Routineを作成'}
        </Button>
        {message && (
          <p className={`text-sm ${message.includes('失敗') ? 'text-destructive' : 'text-muted-foreground'}`}>
            {message}
          </p>
        )}
      </div>
    </form>
  );

  if (asModal) {
    return (
      <Modal
        open={open}
        onClose={() => {
          if (onClose) onClose();
          setMessage('');
        }}
        title="Routineを作成"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (onClose) onClose();
                setMessage('');
              }}
              disabled={pending}
            >
              キャンセル
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {formContent}
        </div>
      </Modal>
    );
  }

  return (
    <Card className="fade-in-up">
      <CardHeader>
        <CardTitle className="text-2xl">Routineを作成</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">カスタム時間ブロックで新しいRoutineを作成します</p>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
