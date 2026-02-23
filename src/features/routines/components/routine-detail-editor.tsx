'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/shared/ui/card';
import { RoutineBlockTimelineEditor } from './routine-block-timeline-editor';
import type { RoutineDetailView, RoutineBlockInput, Routine } from '@/features/routines';
import type { UpdateRoutineInfoPayload, UpdateBlockPayload, AddBlockPayload, DeleteBlockPayload } from '@/features/routines/actions/routines';
import type { ActionResult } from '@/shared/types/actionResult';

type RoutineDetailEditorProps = {
  routine: RoutineDetailView;
  onUpdateRoutineInfo: (payload: UpdateRoutineInfoPayload) => Promise<ActionResult<Routine>>;
  onUpdateBlock: (payload: UpdateBlockPayload) => Promise<ActionResult<Routine>>;
  onAddBlock?: (payload: AddBlockPayload) => Promise<ActionResult<import('@/features/routines').RoutineBlock>>;
  onDeleteBlock?: (payload: DeleteBlockPayload) => Promise<ActionResult<Routine>>;
  onCancel: () => void;
};

export function RoutineDetailEditor({
  routine,
  onUpdateRoutineInfo,
  onUpdateBlock,
  onAddBlock,
  onDeleteBlock,
  onCancel
}: RoutineDetailEditorProps) {
  const [name, setName] = useState(routine.name);
  const [description, setDescription] = useState(routine.description);
  const [purpose, setPurpose] = useState(routine.purpose);
  const [blocks, setBlocks] = useState<RoutineBlockInput[]>(
    routine.timeBlocks.map((block) => ({
      id: block.id,
      day: block.day,
      startHour: block.startHour,
      endHour: block.endHour,
      label: block.label,
      objective: block.objective,
      energyLevel: block.energyLevel as 'low' | 'medium' | 'high'
    }))
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmitRoutineInfo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await onUpdateRoutineInfo({
        routineId: routine.id,
        name: name !== routine.name ? name : undefined,
        description: description !== routine.description ? description : undefined,
        purpose: purpose !== routine.purpose ? purpose : undefined
      });

      if (result.ok) {
        setMessage('Routine情報を更新しました');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setError(result.error ?? 'Routine情報の更新に失敗しました');
      }
    });
  };

  const handleBlocksChange = (newBlocks: RoutineBlockInput[]) => {
    setBlocks(newBlocks);
    // 各ブロックを個別に更新（簡易実装）
    // TODO: バッチ更新を実装するか検討
  };

  const handleSaveAll = () => {
    setError(null);
    setMessage(null);

    // 合計時間が3時間未満の場合は保存前にバリデーション
    const totalMinutes = blocks.reduce((acc, b) => acc + (b.endHour - b.startHour) * 60, 0);
    if (totalMinutes < 180) {
      setError('Routine全体の合計時間は最低3時間必要です。');
      return;
    }

    const originalBlockIds = new Set(routine.timeBlocks.map((b) => b.id));
    const toAdd = blocks.filter((b) => !b.id || !originalBlockIds.has(b.id));
    const toUpdate = blocks.filter((b) => b.id && originalBlockIds.has(b.id));
    const toDelete = routine.timeBlocks.filter((b) => !blocks.some((c) => c.id === b.id));

    startTransition(async () => {
      const infoPatch: { routineId: string; name?: string; description?: string; purpose?: string } = {
        routineId: routine.id
      };
      if (name !== routine.name) infoPatch.name = name;
      if (description !== routine.description) infoPatch.description = description;
      if (purpose !== routine.purpose) infoPatch.purpose = purpose;

      if (infoPatch.name !== undefined || infoPatch.description !== undefined || infoPatch.purpose !== undefined) {
        const infoResult = await onUpdateRoutineInfo(infoPatch);
        if (!infoResult.ok) {
          setError(infoResult.error ?? 'Routine情報の更新に失敗しました');
          return;
        }
      }

      // 1) 新規ブロックを追加（サーバー採番の ID は router.refresh() で再取得するまでローカルに反映されない）
      if (onAddBlock && toAdd.length > 0) {
        for (const block of toAdd) {
          const addResult = await onAddBlock({
            routineId: routine.id,
            block: {
              day: block.day,
              startHour: block.startHour,
              endHour: block.endHour,
              label: block.label,
              objective: block.objective,
              energyLevel: block.energyLevel as 'low' | 'medium' | 'high'
            }
          });
          if (!addResult.ok) {
            setError(addResult.error ?? '時間ブロックの追加に失敗しました');
            return;
          }
        }
      }

      // 2) 既存ブロックの変更を更新
      for (const block of toUpdate) {
        if (!block.id) continue;
        const originalBlock = routine.timeBlocks.find((b) => b.id === block.id);
        if (!originalBlock) continue;
        const hasChanges =
          block.day !== originalBlock.day ||
          block.startHour !== originalBlock.startHour ||
          block.endHour !== originalBlock.endHour ||
          block.label !== originalBlock.label ||
          block.objective !== originalBlock.objective ||
          block.energyLevel !== originalBlock.energyLevel;
        if (!hasChanges) continue;
        const blockResult = await onUpdateBlock({
          routineId: routine.id,
          blockId: block.id,
          block: {
            day: block.day,
            startHour: block.startHour,
            endHour: block.endHour,
            label: block.label,
            objective: block.objective,
            energyLevel: block.energyLevel as 'low' | 'medium' | 'high'
          }
        });
        if (!blockResult.ok) {
          setError(blockResult.error ?? 'Time Blockの更新に失敗しました');
          return;
        }
      }

      // 3) 削除されたブロックを削除
      if (onDeleteBlock && toDelete.length > 0) {
        for (const block of toDelete) {
          const deleteResult = await onDeleteBlock({ routineId: routine.id, blockId: block.id });
          if (!deleteResult.ok) {
            setError(deleteResult.error ?? '時間ブロックの削除に失敗しました');
            return;
          }
        }
      }

      setMessage('Routineを更新しました');
      setTimeout(() => {
        onCancel();
        router.refresh();
      }, 1000);
    });
  };

  return (
    <div className="space-y-6">
      {(error || message) && (
        <Card className={error ? 'border-destructive/50 bg-destructive/10' : 'border-primary/50 bg-primary/10'}>
          <CardContent className="pt-6">
            <p className={`text-sm ${error ? 'text-destructive' : 'text-primary'}`}>
              {error ?? message}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="fade-in-up">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <Badge variant="secondary">{routine.durationType === 'normal' ? 'Day' : routine.durationType === 'weekly' ? 'Weekly' : routine.durationType}</Badge>
            <Badge variant="secondary">{routine.intensity}</Badge>
            <Badge variant={routine.visibility === 'public' ? 'primary' : 'outline'}>{routine.visibility === 'public' ? '公開' : '非公開'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmitRoutineInfo} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="routine-name">Name</Label>
              <Input
                id="routine-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routine-description">Description</Label>
              <Textarea
                id="routine-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={12}
                maxLength={600}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routine-purpose">目的</Label>
              <Input
                id="routine-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                minLength={8}
                maxLength={500}
              />
            </div>
          </form>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </CardContent>
      </Card>

      <section id="blocks" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Time Blocks</h2>
            <p className="text-sm text-muted-foreground">時間ブロックを編集できます</p>
          </div>
          <Badge variant="secondary">{blocks.length} blocks</Badge>
        </div>
        {(() => {
          const totalMinutes = blocks.reduce((acc, b) => acc + (b.endHour - b.startHour) * 60, 0);
          return totalMinutes < 180 ? (
            <p className="text-sm text-destructive" role="alert">
              Routine全体の合計時間は最低3時間必要です。（現在: {(totalMinutes / 60).toFixed(1)}時間）
            </p>
          ) : null;
        })()}
        <Card className="p-6 overflow-visible">
          <RoutineBlockTimelineEditor
            blocks={blocks}
            onChange={handleBlocksChange}
            durationType={routine.durationType}
            normalTimeRange={
              routine.durationType === 'normal' &&
              routine.normalStartHour != null &&
              routine.normalEndHour != null
                ? { startHour: routine.normalStartHour, endHour: routine.normalEndHour }
                : undefined
            }
          />
        </Card>
      </section>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          キャンセル
        </Button>
        <Button
          onClick={handleSaveAll}
          disabled={pending || blocks.reduce((acc, b) => acc + (b.endHour - b.startHour) * 60, 0) < 180}
        >
          {pending ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}
