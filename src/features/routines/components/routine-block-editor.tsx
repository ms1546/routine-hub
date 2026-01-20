'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import type { RoutineDetailView, Routine } from '@/features/routines';
import type { RoutineBlock } from '@/features/routines/domain/models';
import type { ActionResult } from '@/shared/types/actionResult';
import type {
  UpdateBlockPayload,
  DeleteBlockPayload,
  ReorderBlocksPayload
} from '@/features/routines/actions/routines';

type RoutineBlockEditorProps = {
  routine: RoutineDetailView;
  onUpdateBlock: (payload: UpdateBlockPayload) => Promise<ActionResult<Routine>>;
  onDeleteBlock: (payload: DeleteBlockPayload) => Promise<ActionResult<Routine>>;
  onReorderBlocks: (payload: ReorderBlocksPayload) => Promise<ActionResult<Routine>>;
  canEdit: boolean;
};

const weekdayOptions = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
];

const energyLevelOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

export function RoutineBlockEditor({
  routine,
  onUpdateBlock,
  onDeleteBlock,
  onReorderBlocks,
  canEdit
}: RoutineBlockEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const editingBlock = editingId ? routine.timeBlocks.find((b) => b.id === editingId) : null;

  const handleStartEdit = (blockId: string) => {
    setEditingId(blockId);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId || !editingBlock) {
      setError('編集対象のブロックが見つかりません');
      return;
    }

    const formData = new FormData(event.currentTarget);
    // 時間は編集不可のため、元の値を保持
    const block: UpdateBlockPayload['block'] = {
      day: String(formData.get('day')) as RoutineBlock['day'],
      startHour: editingBlock.startHour, // 元の値を保持
      endHour: editingBlock.endHour, // 元の値を保持
      label: String(formData.get('label')),
      objective: String(formData.get('objective')),
      energyLevel: String(formData.get('energyLevel')) as RoutineBlock['energyLevel']
    };

    startTransition(async () => {
      try {
        const result = await onUpdateBlock({
          routineId: routine.id,
          blockId: editingId,
          block
        });
        if (result.ok) {
          setEditingId(null);
          setError(null);
        } else {
          setError(result.error ?? 'ブロックの更新に失敗しました');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      }
    });
  };

  const handleDelete = (blockId: string) => {
    if (!confirm('この時間ブロックを削除してもよろしいですか？')) return;

    startTransition(async () => {
      try {
        const result = await onDeleteBlock({
          routineId: routine.id,
          blockId
        });
        if (!result.ok) {
          setError(result.error ?? 'ブロックの削除に失敗しました');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      }
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...routine.timeBlocks];
    const prev = newOrder[index - 1];
    const current = newOrder[index];
    if (!prev || !current) return;
    newOrder[index - 1] = current;
    newOrder[index] = prev;

    startTransition(async () => {
      try {
        await onReorderBlocks({
          routineId: routine.id,
          blockIds: newOrder.map((b) => b.id)
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      }
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === routine.timeBlocks.length - 1) return;
    const newOrder = [...routine.timeBlocks];
    const current = newOrder[index];
    const next = newOrder[index + 1];
    if (!current || !next) return;
    newOrder[index] = next;
    newOrder[index + 1] = current;

    startTransition(async () => {
      try {
        await onReorderBlocks({
          routineId: routine.id,
          blockIds: newOrder.map((b) => b.id)
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      }
    });
  };

  if (!canEdit) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {routine.timeBlocks.map((block) => (
          <Card key={block.id} className="hover-lift">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <div>
                  <p className="font-medium">{block.label}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{block.objective}</p>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Badge variant="outline" className="text-xs">{block.schedule}</Badge>
                  <Badge variant={block.energyLevel === 'high' ? 'warning' : 'secondary'} className="text-xs">
                    {block.energyLevel}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {routine.timeBlocks.map((block, index) => {
          const isEditing = editingId === block.id;
          const currentEditingBlock = isEditing ? editingBlock : null;

          if (isEditing && currentEditingBlock) {
            return (
              <Card key={block.id} className="border-primary/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">時間ブロックを編集</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`day-${block.id}`}>曜日</Label>
                        <select
                          id={`day-${block.id}`}
                          name="day"
                          defaultValue={currentEditingBlock.day}
                          className="h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary"
                          required
                        >
                          {weekdayOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`energy-${block.id}`}>エネルギーレベル</Label>
                        <select
                          id={`energy-${block.id}`}
                          name="energyLevel"
                          defaultValue={currentEditingBlock.energyLevel}
                          className="h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary"
                          required
                        >
                          {energyLevelOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`start-${block.id}`}>
                          開始時刻
                          <span className="ml-2 text-xs text-muted-foreground font-normal">(読み取り専用)</span>
                        </Label>
                        <Input
                          id={`start-${block.id}`}
                          name="startHour"
                          type="number"
                          min="0"
                          max="21"
                          defaultValue={currentEditingBlock.startHour}
                          disabled
                          className="bg-muted/50 cursor-not-allowed"
                          readOnly
                        />
                        <p className="text-xs text-muted-foreground">
                          時間ブロックの時間は編集できません。Routineの構造を保つためです。異なる時間で新しいRoutineを作成する場合は、このRoutineをCloneしてから編集してください。
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`end-${block.id}`}>
                          終了時刻
                          <span className="ml-2 text-xs text-muted-foreground font-normal">(読み取り専用)</span>
                        </Label>
                        <Input
                          id={`end-${block.id}`}
                          name="endHour"
                          type="number"
                          min="3"
                          max="24"
                          defaultValue={currentEditingBlock.endHour}
                          disabled
                          className="bg-muted/50 cursor-not-allowed"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`label-${block.id}`}>ラベル</Label>
                      <Input
                        id={`label-${block.id}`}
                        name="label"
                        defaultValue={currentEditingBlock.label}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`objective-${block.id}`}>目的</Label>
                      <Textarea
                        id={`objective-${block.id}`}
                        name="objective"
                        defaultValue={currentEditingBlock.objective}
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button type="submit" disabled={pending} size="sm">
                        {pending ? '保存中…' : '保存'}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancelEdit} size="sm" disabled={pending}>
                        キャンセル
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={block.id} className="hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-medium">{block.label}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{block.objective}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-xs">{block.schedule}</Badge>
                      <Badge variant={block.energyLevel === 'high' ? 'warning' : 'secondary'} className="text-xs">
                        {block.energyLevel}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveUp(index)}
                        disabled={pending || index === 0}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="上に移動"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDown(index)}
                        disabled={pending || index === routine.timeBlocks.length - 1}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="下に移動"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(block.id)}
                        disabled={pending}
                        className="h-8 px-3 text-xs"
                      >
                        編集
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(block.id)}
                        disabled={pending || routine.timeBlocks.length <= 1}
                        className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:border-destructive"
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
