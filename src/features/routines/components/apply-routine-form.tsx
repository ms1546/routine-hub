'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import { Modal } from '@/shared/ui/modal';
import { Badge } from '@/shared/ui/badge';
import { Textarea } from '@/shared/ui/textarea';
import type { ActionResult } from '@/shared/types/actionResult';
import type { RoutineApplicationPreview } from '@/features/calendar/domain/mock';
import type { ApplyRoutinePayload } from '@/features/routines/actions/routines';
import type { RecurrencePattern, ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import { getCalendarPreviewAction, confirmProposedEventsAction } from '@/app/actions/calendar';
import { customizeCalendarEventsAction, type CalendarCustomizationResult } from '@/app/actions/calendar-customization';
import { getEvidenceAdviceAction } from '@/app/actions/evidence-advice';
import type { EvidenceAdviceResult } from '@/features/ai/evidence/types';
import { CalendarPreviewVisualization } from './calendar-preview-visualization';

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** 日付文字列（YYYY-MM-DD）をパース。無効な場合は null を返す */
const parseLocalDateInput = (value: string): Date | null => {
  const [yearPart = '', monthPart = '', dayPart = ''] = value.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  if (!yearPart || !monthPart || !dayPart || Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const normalizeLocalDate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const today = () => formatDateInput(new Date());
const plusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
};

// イベント編集モーダルコンポーネント
type EventEditModalProps = {
  event: ProposedCalendarEvent;
  onSave: (edited: Partial<ProposedCalendarEvent>) => void;
  onCancel: () => void;
};

function EventEditModal({ event, onSave, onCancel }: EventEditModalProps) {
  const startDateObj = new Date(event.start);
  const endDateObj = new Date(event.end);

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [date, setDate] = useState(formatDateInput(startDateObj));
  const [startTime, setStartTime] = useState(
    `${String(startDateObj.getHours()).padStart(2, '0')}:${String(startDateObj.getMinutes()).padStart(2, '0')}`
  );
  const [endTime, setEndTime] = useState(
    `${String(endDateObj.getHours()).padStart(2, '0')}:${String(endDateObj.getMinutes()).padStart(2, '0')}`
  );

  // eventが変更されたときに初期値を更新
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    setDate(formatDateInput(start));
    setStartTime(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
    setEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
    setTitle(event.title);
    setDescription(event.description);
  }, [event]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = () => {
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    const startHour = startParts[0] ? Number(startParts[0]) : 0;
    const startMinute = startParts[1] ? Number(startParts[1]) : 0;
    const endHour = endParts[0] ? Number(endParts[0]) : 0;
    const endMinute = endParts[1] ? Number(endParts[1]) : 0;

    // YYYY-MM-DD をローカル日付として解釈（new Date(date) は UTC になるため）
    const baseDate = parseLocalDateInput(date) ?? new Date();
    const startDateTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), startHour, startMinute, 0, 0);
    let endDateTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), endHour, endMinute, 0, 0);

    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    const edited: Partial<ProposedCalendarEvent> = {
      title: title.trim() || event.title,
      description: description.trim() !== event.description ? description.trim() : undefined,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString()
    };

    onSave(edited);
  };

  const startParts = startTime.split(':');
  const endParts = endTime.split(':');
  const startD = new Date(date);
  startD.setHours(Number(startParts[0]) || 0, Number(startParts[1]) || 0, 0, 0);
  const endD = new Date(date);
  endD.setHours(Number(endParts[0]) || 0, Number(endParts[1]) || 0, 0, 0);
  const endWouldBeNextDay = endD <= startD;

  return (
    <Modal
      open={true}
      onClose={onCancel}
      title="イベントを編集"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="edit-event-title">タイトル</Label>
          <Input
            id="edit-event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="イベントのタイトル"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-event-description">説明</Label>
          <Textarea
            id="edit-event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="イベントの説明"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-event-date">日付</Label>
          <Input
            id="edit-event-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {endWouldBeNextDay && (
          <p className="text-xs text-muted-foreground">
            終了時刻が開始より前のため、保存すると終了は翌日に設定されます。
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-event-start-time">開始時刻</Label>
            <Input
              id="edit-event-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-event-end-time">終了時刻</Label>
            <Input
              id="edit-event-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function ApplyRoutineForm({
  routineId,
  durationType,
  action
}: {
  routineId: string;
  durationType: 'normal' | 'weekly';
  action: (payload: ApplyRoutinePayload) => Promise<ActionResult<RoutineApplicationPreview>>;
}) {
  const [status, setStatus] = useState(
    '⚠️ この機能はポートフォリオデモ用の管理者専用機能です。一般ユーザーには提供されていません。'
  );
  const pathname = usePathname();
  const connectUrl = `/api/google-oauth/connect?returnTo=${encodeURIComponent(pathname ?? '/routines')}`;
  const [pending, startTransition] = useTransition();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<{
    proposedEvents: ProposedCalendarEvent[];
    existingEvents: CalendarEvent[];
    startDate: string;
    endDate: string;
    recurrence: RecurrencePattern;
    isCalendarConnected?: boolean;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [useCustomized, setUseCustomized] = useState(false); // カスタマイズされたイベントを使用するか
  const [customizationResult, setCustomizationResult] = useState<CalendarCustomizationResult | null>(null);
  const [evidenceAdvice, setEvidenceAdvice] = useState<EvidenceAdviceResult | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [editedEvents, setEditedEvents] = useState<Map<string, Partial<ProposedCalendarEvent>>>(new Map()); // 手動編集されたイベント
  const [editingEventId, setEditingEventId] = useState<string | null>(null); // 編集中のイベントID
  const [startDate, setStartDate] = useState<string>(today());
  const [weekCount, setWeekCount] = useState<number>(1); // weeklyタイプの場合の週数
  const [endDate, setEndDate] = useState<string>(plusDays(7)); // normal/normal用
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set()); // すべての週を展開
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'weekly' | 'monthly'>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);

  // weeklyの場合、終了日を週数から計算
  const calculatedEndDate = durationType === 'weekly'
    ? (() => {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + (weekCount * 7));
        return formatDateInput(end);
      })()
    : endDate;

  useEffect(() => {
    // weeklyの場合、週数が変更されたら終了日を更新
    if (durationType === 'weekly') {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + (weekCount * 7));
      setEndDate(formatDateInput(end));
    }
  }, [startDate, weekCount, durationType]);

  /** プレビュー＋編集＋AIカスタマイズを反映した適用対象イベント（確認して適用でサーバーに渡す） */
  const displayEventsToApply = useMemo((): ProposedCalendarEvent[] => {
    if (!previewData) return [];
    let base = previewData.proposedEvents;
    if (useCustomized && customizationResult) {
      const normalizedMap = new Map(
        customizationResult.customizedEvents.map((c) => [c.proposalId, c])
      );
      base = base.map((event) => {
        const n = normalizedMap.get(event.proposalId);
        if (!n) return event;
        return {
          ...event,
          title: n.title ?? event.title,
          description: n.description ?? event.description,
          start: n.start ?? event.start,
          end: n.end ?? event.end
        };
      });
    }
    return base.map((event) => {
      const edited = editedEvents.get(event.proposalId);
      if (!edited) return event;
      return { ...event, ...edited } as ProposedCalendarEvent;
    });
  }, [previewData, useCustomized, customizationResult, editedEvents]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const startDateValue = String(formData.get('startDate'));
    const validatedEndDate = durationType === 'weekly' ? calculatedEndDate : endDate;

    // 日付の妥当性チェック（プレビュー取得前に実施）
    const startParsed = parseLocalDateInput(startDateValue);
    if (!startParsed) {
      setStatus('開始日が正しくありません。YYYY-MM-DD 形式で入力してください。');
      return;
    }
    const endParsed = parseLocalDateInput(validatedEndDate);
    if (!endParsed) {
      setStatus('終了日が正しくありません。YYYY-MM-DD 形式で入力してください。');
      return;
    }
    if (startParsed > endParsed) {
      setStatus('終了日は開始日以降を指定してください。');
      return;
    }
    const validatedStartDate = startDateValue;

    // 繰り返し設定
    const recurrence: RecurrencePattern =
      recurrenceType === 'none'
        ? { type: 'none' }
        : recurrenceType === 'weekly'
          ? { type: 'weekly', interval: recurrenceInterval }
          : { type: 'monthly', interval: recurrenceInterval };

    startTransition(async () => {
      // まずプレビューを取得
      setPreviewLoading(true);
      try {
        const preview = await getCalendarPreviewAction({
          routineId,
          startDate: validatedStartDate,
          endDate: validatedEndDate,
          recurrence
        });
        setPreviewData({
          ...preview,
          startDate: validatedStartDate,
          endDate: validatedEndDate,
          recurrence
        });
        // 週ごとの展開状態を初期化（すべての週を展開）
        // 週数を計算してすべて展開
        if (durationType === 'weekly') {
          const weeks = Math.ceil((new Date(validatedEndDate).getTime() - new Date(validatedStartDate).getTime()) / (1000 * 60 * 60 * 24 * 7));
          const allWeeks = Array.from({ length: weeks }, (_, i) => i);
          setExpandedWeeks(new Set(allWeeks));
        } else {
          setExpandedWeeks(new Set([0]));
        }
        setShowPreviewModal(true);
        setStatus(''); // プレビュー表示時はステータスをクリア
        // カスタマイズ結果をリセット
        setCustomizationResult(null);
        setUseCustomized(false);
        setEvidenceAdvice(null);
        // 手動編集をリセット
        setEditedEvents(new Map());
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'プレビューの取得に失敗しました');
      } finally {
        setPreviewLoading(false);
      }
    });
  };

  const handleCustomize = async () => {
    if (!previewData) return;

    setCustomizing(true);
    try {
      const result = await customizeCalendarEventsAction({
        proposedEvents: previewData.proposedEvents,
        existingEvents: previewData.existingEvents,
        routineId // Routine IDを渡す
      });
      setCustomizationResult(result);
      setStatus('カスタマイズが完了しました');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'カスタマイズに失敗しました');
    } finally {
      setCustomizing(false);
    }
  };

  const handleEvidenceAdvice = async () => {
    setEvidenceLoading(true);
    try {
      const result = await getEvidenceAdviceAction({ routineId });
      setEvidenceAdvice(result);
      if (result.suggestions.length === 0) {
        setStatus('根拠が不足しているため提案は表示されませんでした。');
      } else {
        setStatus('根拠付きアドバイスを取得しました');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '根拠付きアドバイスの取得に失敗しました');
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleConfirmApply = async () => {
    if (!previewData) return;

    const allProposalIds = previewData.proposedEvents.map((e) => e.proposalId);

    setConfirming(true);
    try {
      const result = await confirmProposedEventsAction({
        routineId,
        proposalIds: allProposalIds,
        recurrence: previewData.recurrence,
        startDate: previewData.startDate,
        endDate: previewData.endDate,
        events: displayEventsToApply.length > 0 ? displayEventsToApply : undefined
      });
      setStatus(`${result.successCount}件のイベントを適用しました`);
      setShowPreviewModal(false);
      setPreviewData(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'イベントの適用に失敗しました';
      // 管理者制限のエラーメッセージを明確に表示
      if (errorMessage.includes('admin') || errorMessage.includes('portfolio mode')) {
        setStatus(
          'カレンダーへのエクスポートは現在、管理者のみが利用可能です。' +
          'これはポートフォリオモードでの意図的な設計制限です。'
        );
      } else {
        setStatus(errorMessage);
      }
    } finally {
      setConfirming(false);
    }
  };


  return (
    <Card className="w-full p-4">
      <div className="flex justify-end">
        <a href={connectUrl}>
          <Button type="button" variant="outline" size="sm">
            Google Calendarを接続
          </Button>
        </a>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="startDate">開始日</Label>
            <Input
              type="date"
              name="startDate"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          {durationType === 'weekly' ? (
            <div className="space-y-1.5">
              <Label htmlFor="weekCount">期間（週数）</Label>
              <select
                name="weekCount"
                id="weekCount"
                value={weekCount}
                onChange={(e) => setWeekCount(Number(e.target.value))}
                className="h-11 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring/50"
                required
              >
                <option value={1}>1週間</option>
                <option value={2}>2週間</option>
                <option value={3}>3週間</option>
                <option value={4}>4週間</option>
              </select>
              <p className="text-xs text-muted-foreground">
                終了日: {calculatedEndDate}（自動計算）
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="endDate">終了日</Label>
              <Input
                type="date"
                name="endDate"
                id="endDate"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        {/* 繰り返し設定 */}
        <div className="space-y-2">
          <Label htmlFor="recurrenceType">繰り返し設定</Label>
          <div className="flex gap-2 items-center">
            <select
              id="recurrenceType"
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value as 'none' | 'weekly' | 'monthly')}
              className="h-11 flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring/50"
            >
              <option value="none">繰り返さない</option>
              <option value="weekly">毎週</option>
              <option value="monthly">毎月</option>
            </select>
            {recurrenceType !== 'none' && (
              <>
                <Label htmlFor="recurrenceInterval" className="text-muted-foreground text-xs shrink-0">
                  間隔
                </Label>
                <select
                  id="recurrenceInterval"
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                  aria-label="繰り返しの間隔（週または月の単位）"
                  className="h-11 w-24 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring/50"
                >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
                </select>
              </>
            )}
          </div>
          {recurrenceType !== 'none' && (
            <p className="text-xs text-muted-foreground">
              {recurrenceType === 'weekly'
                ? `毎週${recurrenceInterval > 1 ? `${recurrenceInterval}週間` : ''}ごとに繰り返します`
                : `毎月${recurrenceInterval > 1 ? `${recurrenceInterval}ヶ月` : ''}ごとに繰り返します`}
            </p>
          )}
        </div>

        <Button type="submit" disabled={pending || previewLoading} className="w-full">
          {pending || previewLoading ? 'プレビューを取得中…' : '適用'}
        </Button>
      </form>
      {status && (
        <p
          className={`text-sm mt-2 ${status.includes('失敗') || status.includes('正しくありません') || status.includes('指定してください') ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
        >
          {status}
        </p>
      )}

      {/* 確認モーダル */}
      <Modal
        open={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setStatus(''); // モーダルを閉じたときにステータスをリセット
        }}
        title="カレンダー適用の確認"
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPreviewModal(false)} disabled={confirming}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmApply} disabled={confirming || !previewData || previewData.proposedEvents.length === 0}>
              {confirming ? '適用中…' : '確認して適用'}
            </Button>
          </div>
        }
      >
      {previewData && (() => {
          const displayEvents = displayEventsToApply;

          return (
            <div className="space-y-6">
              {previewData.isCalendarConnected === false && (
                <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
                  <p className="text-sm text-warning-foreground">
                    Google Calendarが未接続のため、既存予定は取得していません。
                    反映する場合は先に「Google Calendarを接続」を実行してください。
                  </p>
                </div>
              )}
              {/* AIカスタマイズセクション */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold mb-1">AIカスタマイズ</h4>
                    <p className="text-sm text-muted-foreground">
                      あなたの設定に基づいてイベントを最適化します
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCustomize}
                    disabled={customizing || !previewData}
                  >
                    {customizing ? 'カスタマイズ中...' : 'AIでカスタマイズ'}
                  </Button>
                </div>

                {customizationResult && (
                  <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary-foreground">
                        カスタマイズが完了しました
                      </p>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useCustomized}
                            onChange={(e) => setUseCustomized(e.target.checked)}
                            className="rounded border-input"
                          />
                          <span>カスタマイズ結果を使用</span>
                        </label>
                      </div>
                    </div>

                    {customizationResult.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-primary-foreground">提案:</p>
                        <ul className="space-y-1">
                          {customizationResult.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-xs text-primary-foreground/80">
                              • {suggestion.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 根拠付きアドバイスセクション */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold mb-1">根拠付きアドバイス</h4>
                    <p className="text-sm text-muted-foreground">
                      無料の論文データを参照して提案を生成します
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEvidenceAdvice}
                    disabled={evidenceLoading}
                  >
                    {evidenceLoading ? '取得中...' : '根拠付きで提案'}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {evidenceAdvice?.disclaimer ??
                    '本機能は情報提供のみを目的とした提案です。最終判断はユーザーが行ってください。'}
                </p>

                {evidenceAdvice && (
                  <div className="rounded-lg border border-muted-foreground/20 bg-muted/20 p-4 space-y-3">
                    {evidenceAdvice.query && (
                      <p className="text-xs text-muted-foreground">検索クエリ: {evidenceAdvice.query}</p>
                    )}

                    {evidenceAdvice.warnings.length > 0 && (
                      <ul className="space-y-1">
                        {evidenceAdvice.warnings.map((warning, index) => (
                          <li key={index} className="text-xs text-warning-foreground">
                            ⚠️ {warning}
                          </li>
                        ))}
                      </ul>
                    )}

                    {evidenceAdvice.suggestions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        根拠が不足しているため提案を表示できません。
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {evidenceAdvice.suggestions.map((suggestion) => (
                          <div key={suggestion.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{suggestion.confidence}</Badge>
                              <p className="text-sm font-medium">提案</p>
                            </div>
                            <p className="text-sm text-primary-foreground/80">{suggestion.description}</p>
                            <div className="rounded-md border border-border/60 bg-background/50 p-3">
                              <p className="text-xs font-medium mb-2">引用</p>
                              {suggestion.evidence.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  引用が見つからなかったため、一般的な提案を表示しています。
                                </p>
                              ) : (
                                <ul className="space-y-1">
                                  {suggestion.evidence.map((citation) => (
                                    <li key={citation.sourceId} className="text-xs text-muted-foreground">
                                      <span className="font-medium">{citation.title}</span>
                                      {citation.year ? ` (${citation.year})` : ''}
                                      {citation.venue ? ` / ${citation.venue}` : ''}
                                      {citation.url && (
                                        <>
                                          {' '}
                                          <a
                                            href={citation.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline"
                                          >
                                            出典
                                          </a>
                                        </>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* カレンダープレビュー可視化 */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">カレンダープレビュー</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {previewData.startDate} から {previewData.endDate} までの範囲で適用されます
                  </p>
                </div>
                <CalendarPreviewVisualization
                  proposedEvents={displayEvents}
                  existingEvents={previewData.existingEvents}
                  selectedIds={displayEvents.map((e) => e.proposalId)}
                />
              </div>

            {/* 適用されるイベントの一覧（週ごとに展開/折りたたみ） */}
            {displayEvents.length > 0 && (() => {
              // イベントを週ごとにグループ化
              const eventsByWeek = new Map<number, ProposedCalendarEvent[]>();
              const startDateObj = parseLocalDateInput(previewData.startDate) ?? new Date(previewData.startDate);
              const startOfPreview = normalizeLocalDate(startDateObj);

              displayEvents.forEach((event) => {
                const eventDate = normalizeLocalDate(new Date(event.start));
                const diffTime = eventDate.getTime() - startOfPreview.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const weekIndex = Math.floor(diffDays / 7);

                if (!eventsByWeek.has(weekIndex)) {
                  eventsByWeek.set(weekIndex, []);
                }
                eventsByWeek.get(weekIndex)!.push(event);
              });

              const weeks = Array.from(eventsByWeek.keys()).sort((a, b) => a - b);

              return (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2">適用されるイベント</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {displayEvents.length}件のイベントが適用されます{useCustomized && customizationResult && '（AIカスタマイズ済み）'}
                    </p>
                    {displayEvents.some((event) =>
                      previewData.existingEvents.some((existing) => {
                        const eventStart = new Date(event.start);
                        const eventEnd = new Date(event.end);
                        const existingStart = new Date(existing.start);
                        const existingEnd = new Date(existing.end);
                        return (
                          (eventStart >= existingStart && eventStart < existingEnd) ||
                          (eventEnd > existingStart && eventEnd <= existingEnd) ||
                          (eventStart <= existingStart && eventEnd >= existingEnd)
                        );
                      })
                    ) && (
                      <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 mb-3">
                        <p className="text-sm text-warning-foreground">
                          ⚠️ 重複する予定があるイベントは適用されません。重複がある場合は事前にカレンダーを調整してください。
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {weeks.map((weekIndex) => {
                      const weekEvents = eventsByWeek.get(weekIndex) ?? [];
                      const weekStartDate = new Date(startOfPreview);
                      weekStartDate.setDate(weekStartDate.getDate() + (weekIndex * 7));
                      const weekEndDate = new Date(weekStartDate);
                      weekEndDate.setDate(weekEndDate.getDate() + 6);

                      const isExpanded = expandedWeeks.has(weekIndex);
                      const weekLabel = `第${weekIndex + 1}週 (${weekStartDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} - ${weekEndDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })})`;

                      return (
                        <div key={weekIndex} className="border border-border/60 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              const newExpanded = new Set(expandedWeeks);
                              if (isExpanded) {
                                newExpanded.delete(weekIndex);
                              } else {
                                newExpanded.add(weekIndex);
                              }
                              setExpandedWeeks(newExpanded);
                            }}
                            className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{weekLabel}</span>
                              <Badge variant="secondary" className="text-xs">
                                {weekEvents.length}件
                              </Badge>
                              {weekEvents.some((event) =>
                                previewData.existingEvents.some((existing) => {
                                  const eventStart = new Date(event.start);
                                  const eventEnd = new Date(event.end);
                                  const existingStart = new Date(existing.start);
                                  const existingEnd = new Date(existing.end);
                                  return (
                                    (eventStart >= existingStart && eventStart < existingEnd) ||
                                    (eventEnd > existingStart && eventEnd <= existingEnd) ||
                                    (eventStart <= existingStart && eventEnd >= existingEnd)
                                  );
                                })
                              ) && (
                                <Badge variant="destructive" className="text-xs">重複あり</Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="p-4 bg-background">
                              <div className="grid gap-2 sm:grid-cols-2">
                                {weekEvents.map((event) => {
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

                                  const isEdited = editedEvents.has(event.proposalId);

                                  return (
                                    <div
                                      key={event.proposalId}
                                      className={`flex items-start gap-3 rounded-lg border p-3 ${
                                        hasConflict ? 'border-destructive/50 bg-destructive/5' : 'border-border/60 bg-muted/20'
                                      }`}
                                    >
                                      <div className="flex-1 space-y-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{event.title}</p>
                                            {isEdited && <Badge variant="secondary" className="text-xs shrink-0">編集済み</Badge>}
                                          </div>
                                          {hasConflict && <Badge variant="destructive" className="text-xs shrink-0">重複</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(event.start).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
                                          {' '}
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
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingEventId(event.proposalId)}
                                        className="h-8 w-8 p-0 shrink-0"
                                        title="編集"
                                      >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            </div>
          );
        })()}
        {!previewData && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">プレビューデータがありません</p>
          </div>
        )}
      </Modal>

      {/* イベント編集モーダル */}
      {previewData && editingEventId && (() => {
        // displayEventsを計算（IIFEの外から参照できるように）
        const calculatedDisplayEvents = (() => {
          let baseEvents = previewData.proposedEvents;
          if (useCustomized && customizationResult) {
            const normalizedMap = new Map(
              customizationResult.customizedEvents.map((c) => [c.proposalId, c])
            );
            baseEvents = previewData.proposedEvents.map((event) => {
              const normalized = normalizedMap.get(event.proposalId);
              if (!normalized) return event;
              return {
                ...event,
                title: normalized.title ?? event.title,
                description: normalized.description ?? event.description,
                start: normalized.start ?? event.start,
                end: normalized.end ?? event.end
              };
            });
          }
          return baseEvents.map((event) => {
            const edited = editedEvents.get(event.proposalId);
            if (!edited) return event;
            return { ...event, ...edited };
          });
        })();

        const event = calculatedDisplayEvents.find((e) => e.proposalId === editingEventId);
        if (!event) return null;

        return (
          <EventEditModal
            event={event}
            onSave={(edited) => {
              const newEdited = new Map(editedEvents);
              newEdited.set(event.proposalId, edited);
              setEditedEvents(newEdited);
              setEditingEventId(null);
            }}
            onCancel={() => setEditingEventId(null)}
          />
        );
      })()}
    </Card>
  );
}
