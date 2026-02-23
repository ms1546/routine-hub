'use client';

import type { FormEvent } from 'react';
import { useState, useTransition, useEffect } from 'react';
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

// 15分刻みの時刻オプションを生成（0:00 から 23:45 まで）
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      options.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return options;
};

// 時刻表記を小数時間に変換（例: "9:15" → 9.25, "9:30" → 9.5）
const parseTimeToHour = (timeStr: string): number => {
  const parts = timeStr.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(h) || isNaN(m)) return 0;
  return h + m / 60;
};

// 小数時間を時刻表記に変換（例: 9.25 → "09:15", 9.5 → "09:30"）
const formatHourToTime = (hour: number): string => {
  const h = Math.floor(hour);
  const minutes = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export type RoutineComposerProps = {
  action: (formData: FormData) => Promise<ActionResult<Routine>>;
  asModal?: boolean; // モーダルとして表示するか
  open?: boolean; // モーダルの開閉状態（asModal=trueの場合）
  onClose?: () => void; // モーダルを閉じるコールバック（asModal=trueの場合）
  userEmail?: string; // ユーザーのメールアドレス（オーナーとして自動設定）
};

export function RoutineComposer({ action, asModal = false, open = false, onClose, userEmail }: RoutineComposerProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [durationType, setDurationType] = useState<'normal' | 'weekly'>('normal');
  const [blocks, setBlocks] = useState<RoutineBlockInput[]>([]);
  // normalタイプの場合の時間範囲（デフォルト: 0:00-24:00 = 24時間）
  const [normalStartHour, setNormalStartHour] = useState<number>(0);
  const [normalEndHour, setNormalEndHour] = useState<number>(24);
  /** 時間範囲変更で範囲外ブロックが削除されたときの通知（ユーザー向け） */
  const [rangeTrimmedMessage, setRangeTrimmedMessage] = useState<string | null>(null);
  const router = useRouter();

  // 時間範囲が変更された時に、範囲外のBlockを自動削除
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (durationType === 'normal' && blocks.length > 0) {
      const blocksBeforeFilter = blocks.length;
      const adjustedBlocks = blocks
        .filter((block) => {
          // Block全体が範囲外の場合は削除
          if (block.endHour <= normalStartHour || block.startHour >= normalEndHour) {
            return false; // 削除
          }

          // Blockの一部が範囲内にある場合のみ残す
          return true;
        })
        .map((block) => {
          let adjustedBlock = { ...block };

          // Blockの一部が範囲内にある場合、範囲内に調整
          // 開始時刻が範囲外の場合、範囲内に調整
          if (adjustedBlock.startHour < normalStartHour) {
            adjustedBlock.startHour = normalStartHour;
          }
          if (adjustedBlock.startHour > normalEndHour) {
            adjustedBlock.startHour = Math.max(normalStartHour, normalEndHour - 0.25); // 最低15分を確保
          }

          // 終了時刻が範囲外の場合、範囲内に調整
          if (adjustedBlock.endHour > normalEndHour) {
            adjustedBlock.endHour = normalEndHour;
          }
          if (adjustedBlock.endHour < normalStartHour) {
            adjustedBlock.endHour = Math.min(normalEndHour, normalStartHour + 0.25); // 最低15分を確保
          }

          // 最小期間（15分）を確保
          if (adjustedBlock.endHour - adjustedBlock.startHour < 0.25) {
            if (adjustedBlock.startHour + 0.25 <= normalEndHour) {
              adjustedBlock.endHour = adjustedBlock.startHour + 0.25;
            } else {
              adjustedBlock.startHour = Math.max(normalStartHour, adjustedBlock.endHour - 0.25);
            }
          }

          return adjustedBlock;
        })
        // 重複チェック: 調整後のBlockが重複していないことを確認
        .filter((adjustedBlock, currentIndex, array) => {
          // 同じ曜日で時間が重複するBlockがないかチェック
          return !array.some((otherBlock, otherIndex) => {
            if (otherIndex === currentIndex) return false; // 自分自身は除外
            if (otherBlock.day !== adjustedBlock.day) return false; // 異なる曜日は重複しない

            // 時間帯の重複判定: (start1 < end2 && end1 > start2) または完全に同じ時間範囲
            const isSameTimeRange = otherBlock.startHour === adjustedBlock.startHour && otherBlock.endHour === adjustedBlock.endHour;
            const hasTimeOverlap = otherBlock.startHour < adjustedBlock.endHour && otherBlock.endHour > adjustedBlock.startHour;
            return isSameTimeRange || hasTimeOverlap;
          });
        });

      // 変更検知: 長さが変わった or 同一IDのブロックで時刻が変わった
      const idToOriginal = new Map(blocks.map((b) => [b.id, b]));
      const lengthChanged = adjustedBlocks.length !== blocks.length;
      const anyTimeChanged = adjustedBlocks.some((adj) => {
        const orig = adj.id != null ? idToOriginal.get(adj.id) : undefined;
        if (!orig) return true; // 新規 or 不明なら変更ありとみなす
        return adj.startHour !== orig.startHour || adj.endHour !== orig.endHour;
      });
      const hasChanges = lengthChanged || anyTimeChanged;

      if (hasChanges) {
        if (blocksBeforeFilter > adjustedBlocks.length) {
          const deletedCount = blocksBeforeFilter - adjustedBlocks.length;
          setRangeTrimmedMessage(`時間範囲を変更したため、範囲外の時間ブロック ${deletedCount} 個を削除しました。`);
        } else {
          setRangeTrimmedMessage(null);
        }
        setBlocks(adjustedBlocks);
      }
    } else {
      setRangeTrimmedMessage(null);
    }
  }, [normalStartHour, normalEndHour, durationType, blocks]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    const description = String(formData.get('description') ?? '').trim();
    const purpose = String(formData.get('purpose') ?? '').trim();
    if (!purpose) {
      setError('目的は必須です。');
      return;
    }
    if (!description) {
      setError('Descriptionは必須です。');
      return;
    }
    if (blocks.length === 0) {
      setError('時間ブロックは少なくとも1つ必要です。');
      return;
    }

    const sanitizedBlocks = blocks.map(({ id: _id, ...rest }) => rest);

    formData.set('purpose', purpose);
    formData.set('description', description);
    formData.set('timeBlocks', JSON.stringify(sanitizedBlocks));
    setError(null);

    // userEmailが指定されている場合は自動設定
    if (userEmail) {
      formData.set('owner', userEmail);
    }

    // normalタイプの場合、時間範囲を設定
    if (durationType === 'normal') {
      formData.set('normalStartHour', normalStartHour.toString());
      formData.set('normalEndHour', normalEndHour.toString());
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        setError(null);
        setMessage(`Routine「${result.data?.name ?? ''}」を作成しました`);
        formElement.reset();

        // デフォルトブロックにリセット（空の配列）
        setBlocks([]);
        setDurationType('normal');
        setNormalStartHour(0);
        setNormalEndHour(24);
        setRangeTrimmedMessage(null);

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
        setMessage('');
        setError(result.error ?? 'Routineの作成に失敗しました');
      }
    });
  };

  const selectClassName =
    'relative h-11 w-full rounded-lg border border-input/60 bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring/50 focus-visible:shadow-lg focus-visible:shadow-ring/20';

  const formContent = (
    <form id="routine-composer-form" className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="routine-name">Name</Label>
          <Input name="name" id="routine-name" placeholder="Async Leadership Warm-up" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="routine-purpose">目的</Label>
          <Input
            name="purpose"
            id="routine-purpose"
            placeholder="Clarify what success looks like"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="routine-description">Description</Label>
        <Textarea
          name="description"
          id="routine-description"
          placeholder="Explain the shape of this routine"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="routine-tags">Tags</Label>
        <Input name="tags" id="routine-tags" placeholder="focus, leadership" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2.5">
          <Label htmlFor="durationType">Duration</Label>
          <select
            name="durationType"
            id="durationType"
            value={durationType}
            onChange={(e) => {
              const newDurationType = e.target.value as 'normal' | 'weekly';
              // Duration typeを変更する場合は全てのBlockを削除
              if (newDurationType !== durationType && blocks.length > 0) {
                if (confirm('Duration typeを変更すると、すべての時間ブロックが削除されます。続行しますか？')) {
                  setDurationType(newDurationType);
                  setBlocks([]);
                }
              } else {
                setDurationType(newDurationType);
              }
            }}
            className={selectClassName}
          >
            <option value="normal">Day</option>
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

      {/* normalタイプの場合、時間範囲を設定 */}
      {durationType === 'normal' && (
        <div className="grid gap-4 md:grid-cols-2 border-t border-border/50 pt-4">
          <div className="space-y-2">
            <Label htmlFor="normal-start-hour">開始時刻</Label>
            <select
              id="normal-start-hour"
              value={formatHourToTime(normalStartHour)}
              onChange={(e) => {
                const hour = parseTimeToHour(e.target.value);
                setNormalStartHour(hour);
                setError(null); // エラーをクリア
              }}
              className={selectClassName}
            >
              {generateTimeOptions().map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="normal-end-hour">終了時刻</Label>
            <select
              id="normal-end-hour"
              value={formatHourToTime(normalEndHour)}
              onChange={(e) => {
                const hour = parseTimeToHour(e.target.value);
                setNormalEndHour(hour);
                setError(null); // エラーをクリア
              }}
              className={selectClassName}
            >
              {[
                ...generateTimeOptions().filter((time) => {
                  const hour = parseTimeToHour(time);
                  return hour > normalStartHour;
                }),
                ...(normalStartHour < 24 ? ['24:00'] : [])
              ].map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 space-y-1">
            {(() => {
              const timeRangeHours = normalEndHour - normalStartHour;
              if (timeRangeHours < 3) {
                return (
                  <p className="text-sm text-destructive">
                    時間範囲は最低3時間必要です（現在: {timeRangeHours.toFixed(2)}時間）
                  </p>
                );
              }
              if (timeRangeHours > 24) {
                return (
                  <p className="text-sm text-destructive">
                    時間範囲は最高24時間までです（現在: {timeRangeHours.toFixed(2)}時間）
                  </p>
                );
              }
              return (
                <p className="text-sm text-muted-foreground">
                  この時間範囲内で時間ブロックを配置できます（{formatHourToTime(normalStartHour)}-{formatHourToTime(normalEndHour)}、合計{timeRangeHours.toFixed(2)}時間）
                </p>
              );
            })()}
          </div>
        </div>
      )}

      {rangeTrimmedMessage && (
        <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2" role="status">
          {rangeTrimmedMessage}
        </p>
      )}

      {/* ビジュアルタイムライン編集 */}
      <RoutineBlockTimelineEditor
        blocks={blocks}
        onChange={setBlocks}
        durationType={durationType}
        normalTimeRange={durationType === 'normal' ? { startHour: normalStartHour, endHour: normalEndHour } : undefined}
      />

      {/* エラーメッセージ */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 成功メッセージ（エラー時は上記のエラー表示のみ） */}
      {message && !error && (
        <Card className="border-primary/50 bg-primary/10">
          <CardContent className="pt-6">
            <p className="text-sm text-primary">{message}</p>
          </CardContent>
        </Card>
      )}

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
            <Button
              type="submit"
              form="routine-composer-form"
              disabled={pending || (durationType === 'normal' && (normalEndHour - normalStartHour < 3 || normalEndHour - normalStartHour > 24))}
            >
              {pending ? '作成中...' : 'Routineを作成'}
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
