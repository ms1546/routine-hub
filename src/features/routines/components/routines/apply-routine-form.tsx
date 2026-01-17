'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import { Modal } from '@/shared/ui/modal';
import { Badge } from '@/shared/ui/badge';
import type { ActionResult } from '@/shared/types/actionResult';
import type { RoutineApplicationPreview } from '@/features/calendar/domain/mock';
import type { ApplyRoutinePayload } from '@/features/routines/actions/routines';
import type { RecurrencePattern, ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import { getCalendarPreviewAction, confirmProposedEventsAction } from '@/app/actions/calendar';
import { CalendarPreviewVisualization } from './calendar-preview-visualization';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export function ApplyRoutineForm({
  routineId,
  action
}: {
  routineId: string;
  action: (payload: ApplyRoutinePayload) => Promise<ActionResult<RoutineApplicationPreview>>;
}) {
  const [status, setStatus] = useState('日付範囲を選択してカレンダーに適用します。');
  const [pending, startTransition] = useTransition();
  const [recurrenceType, setRecurrenceType] = useState<string>('none');
  const intervalContainerRef = useRef<HTMLDivElement>(null);
  const intervalDescriptionRef = useRef<HTMLSpanElement>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<{
    proposedEvents: ProposedCalendarEvent[];
    existingEvents: CalendarEvent[];
    startDate: string;
    endDate: string;
    recurrence: RecurrencePattern;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const startDate = String(formData.get('startDate'));
    const endDate = String(formData.get('endDate'));
    const recurrenceType = String(formData.get('recurrenceType'));
    const recurrenceInterval = formData.get('recurrenceInterval')
      ? Number(formData.get('recurrenceInterval'))
      : undefined;

    let recurrence: { type: 'none' } | { type: 'weekly'; interval: number } | { type: 'monthly'; interval: number } = { type: 'none' };
    if (recurrenceType === 'weekly') {
      recurrence = { type: 'weekly', interval: recurrenceInterval ?? 1 };
    } else if (recurrenceType === 'monthly') {
      recurrence = { type: 'monthly', interval: recurrenceInterval ?? 1 };
    }

    startTransition(async () => {
      // まずプレビューを取得
      setPreviewLoading(true);
      try {
        const preview = await getCalendarPreviewAction({
          routineId,
          startDate,
          endDate,
          recurrence
        });
        setPreviewData({
          ...preview,
          startDate,
          endDate,
          recurrence
        });
        setSelectedProposalIds(preview.proposedEvents.map((e) => e.proposalId));
        setShowPreviewModal(true);
        setStatus(`プレビューを表示中...`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'プレビューの取得に失敗しました');
      } finally {
        setPreviewLoading(false);
      }
    });
  };

  const handleConfirmApply = async () => {
    if (!previewData || selectedProposalIds.length === 0) return;

    setConfirming(true);
    try {
      const result = await confirmProposedEventsAction({
        routineId,
        proposalIds: selectedProposalIds,
        recurrence: previewData.recurrence
      });
      setStatus(`${result.successCount}件のイベントを適用しました`);
      setShowPreviewModal(false);
      setPreviewData(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'イベントの適用に失敗しました');
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (intervalContainerRef.current && intervalDescriptionRef.current) {
      if (recurrenceType === 'weekly') {
        intervalContainerRef.current.style.display = 'block';
        intervalDescriptionRef.current.textContent = '毎週の場合、1=毎週、2=隔週、3=3週間ごと';
      } else if (recurrenceType === 'monthly') {
        intervalContainerRef.current.style.display = 'block';
        intervalDescriptionRef.current.textContent = '毎月の場合、1=毎月、2=隔月、3=3ヶ月ごと';
      } else {
        intervalContainerRef.current.style.display = 'none';
      }
    }
  }, [recurrenceType]);

  return (
    <Card className="w-full p-4">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="startDate">開始日</Label>
            <Input type="date" name="startDate" id="startDate" defaultValue={today()} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">終了日</Label>
            <Input type="date" name="endDate" id="endDate" defaultValue={plusDays(7)} required />
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="recurrenceType">繰り返し設定</Label>
            <select
              name="recurrenceType"
              id="recurrenceType"
              className="h-11 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring/50"
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value)}
            >
              <option value="none">繰り返さない（単発）</option>
              <option value="weekly">毎週</option>
              <option value="monthly">毎月</option>
            </select>
          </div>

          <div ref={intervalContainerRef} className="space-y-1.5" style={{ display: 'none' }}>
            <Label htmlFor="recurrenceInterval">間隔</Label>
            <Input
              type="number"
              name="recurrenceInterval"
              id="recurrenceInterval"
              min="1"
              max={recurrenceType === 'weekly' ? 52 : 12}
              defaultValue="1"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              <span ref={intervalDescriptionRef}>毎週の場合、1=毎週、2=隔週、3=3週間ごと</span>
            </p>
          </div>
        </div>

        <Button type="submit" disabled={pending || previewLoading} className="w-full">
          {pending || previewLoading ? 'プレビューを取得中…' : '適用'}
        </Button>
      </form>
      {status && <p className="text-sm text-muted-foreground mt-2">{status}</p>}

      {/* 確認モーダル */}
      <Modal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="カレンダー適用の確認"
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPreviewModal(false)} disabled={confirming}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmApply} disabled={confirming || selectedProposalIds.length === 0}>
              {confirming ? '適用中…' : '確認して適用'}
            </Button>
          </div>
        }
      >
        {previewData && (
          <div className="space-y-6">
            {/* カレンダープレビュー可視化 */}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-1">カレンダープレビュー</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {previewData.startDate} から {previewData.endDate} までの範囲で適用されます
                </p>
              </div>
              <CalendarPreviewVisualization
                proposedEvents={previewData.proposedEvents}
                existingEvents={previewData.existingEvents}
                selectedIds={selectedProposalIds}
              />
            </div>

            {/* 提案イベント選択 */}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2">適用するイベントを選択</h4>
                <p className="text-sm text-muted-foreground">チェックを外したイベントは適用されません</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {previewData.proposedEvents.map((event) => {
                  const isSelected = selectedProposalIds.includes(event.proposalId);
                  const hasConflict = previewData.existingEvents.some((existing) => {
                    const eventStart = new Date(event.start);
                    const eventEnd = new Date(event.end);
                    const existingStart = new Date(existing.start);
                    const existingEnd = new Date(existing.end);
                    return (
                      (eventStart >= existingStart && eventStart < existingEnd) ||
                      (eventEnd > existingStart && eventEnd <= existingEnd) ||
                      (eventStart <= existingStart && eventEnd >= existingEnd)
                    );
                  });

                  return (
                    <label
                      key={event.proposalId}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border/60 hover:border-primary/50 hover:bg-muted/30'
                      } ${hasConflict ? 'border-destructive/50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProposalIds((ids) => [...ids, event.proposalId]);
                          } else {
                            setSelectedProposalIds((ids) => ids.filter((id) => id !== event.proposalId));
                          }
                        }}
                        className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          {hasConflict && <Badge variant="destructive" className="text-xs shrink-0">重複</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.start).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {' - '}
                          {new Date(event.end).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* AIカスタマイズ提案のプレースホルダー */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                💡 既存のスケジュールを動かさずに、Routineの目的を達成するためのカスタマイズ提案は現在開発中です。
              </p>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
