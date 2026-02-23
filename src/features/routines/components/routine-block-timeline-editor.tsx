'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Modal } from '@/shared/ui/modal';
import { Badge } from '@/shared/ui/badge';
import type { RoutineBlockInput } from '@/features/routines';

type RoutineBlockTimelineEditorProps = {
  blocks: RoutineBlockInput[];
  onChange: (blocks: RoutineBlockInput[]) => void;
  durationType: 'normal' | 'weekly';
  normalTimeRange?: { startHour: number; endHour: number }; // normalタイプの場合の時間範囲
};

const weekdayLabels: Record<string, string> = {
  monday: '月',
  tuesday: '火',
  wednesday: '水',
  thursday: '木',
  friday: '金',
  saturday: '土',
  sunday: '日'
};

const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

// 次の曜日を取得
const getNextDay = (currentDay: string): typeof weekdayOrder[number] => {
  const currentIndex = weekdayOrder.indexOf(currentDay as typeof weekdayOrder[number]);
  if (currentIndex === -1) return 'monday' as const;
  const nextIndex = (currentIndex + 1) % weekdayOrder.length;
  return weekdayOrder[nextIndex] as typeof weekdayOrder[number];
};

// Weeklyタイプで24時間を超えた場合、次の日に移動する処理
const normalizeWeeklyBlock = (block: RoutineBlockInput): RoutineBlockInput => {
  let { day, startHour, endHour } = block;

  // startHourとendHourの両方が24時間未満の場合は何もしない
  if (startHour < 24 && endHour < 24) {
    return block;
  }

  // 24時を超えた場合、次の日の0時以降に入るようにする
  // startHourとendHourのうち、より大きい方の日数分だけ曜日を進める
  const startDays = Math.floor(startHour / 24);
  const endDays = Math.floor(endHour / 24);
  const maxDays = Math.max(startDays, endDays);

  // 曜日を進める
  let newDay: typeof weekdayOrder[number] = day as typeof weekdayOrder[number];
  for (let i = 0; i < maxDays; i++) {
    newDay = getNextDay(newDay);
  }

  // 24時間を超えた場合、次の日の0時以降に入るようにする
  // 24時を超えた場合は、次の日の0時から始まるようにする
  // 例：月曜25:00 → 火曜0:00、月曜26:00 → 火曜0:00
  if (startHour >= 24) {
    // 24時を超えた分は無視して、次の日の0時から始まる
    startHour = 0;
  }
  if (endHour >= 24) {
    // 24時を超えた分は、次の日の0時からの時間として計算
    // 例：月曜26:00 → 火曜2:00（26 - 24 = 2）
    endHour = endHour - (Math.floor(endHour / 24) * 24);
  }

  return {
    ...block,
    day: newDay as typeof block.day,
    startHour,
    endHour
  };
};

const energyLevelColors: Record<string, string> = {
  high: 'bg-warning/60 border-warning/90',
  medium: 'bg-primary/60 border-primary/90',
  low: 'bg-muted-foreground/20 border-muted-foreground/40'
};

const energyLevelLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高'
};

// 小数時間を時刻表記に変換（例: 9.25 → "09:15", 9.5 → "09:30", 24.25 → "24:15"）
const formatHourToTime = (hour: number): string => {
  // 24時間を超えた場合もそのまま表示（weeklyタイプ用）
  const h = Math.floor(hour);
  const minutes = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// 時刻表記を小数時間に変換（例: "9:15" → 9.25, "9:30" → 9.5）
const parseTimeToHour = (timeStr: string): number => {
  const parts = timeStr.split(':');
  const h = parts[0] ? Number(parts[0]) : 0;
  const m = parts[1] ? Number(parts[1]) : 0;
  if (isNaN(h) || isNaN(m)) return 0;
  return h + m / 60;
};

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

// 時刻を15分刻みに丸める
const roundTo15Minutes = (timeStr: string): string => {
  const hour = parseTimeToHour(timeStr);
  const roundedMinutes = Math.round((hour % 1) * 60 / 15) * 15;
  const h = Math.floor(hour);
  const m = roundedMinutes >= 60 ? 0 : roundedMinutes;
  const finalH = roundedMinutes >= 60 ? h + 1 : h;
  return `${Math.min(23, finalH).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export function RoutineBlockTimelineEditor({
  blocks,
  onChange,
  durationType,
  normalTimeRange
}: RoutineBlockTimelineEditorProps) {
  const [editingBlock, setEditingBlock] = useState<RoutineBlockInput | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<RoutineBlockInput | null>(null);
  const [dragStartDay, setDragStartDay] = useState<string | null>(null);
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeSide, setResizeSide] = useState<'left' | 'right' | null>(null);
  const [hasDragged, setHasDragged] = useState(false); // ドラッグが発生したかどうか
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineRefsByDay = useRef<Record<string, HTMLDivElement | null>>({});
  const nextBlockIdRef = useRef(0);

  const isDayBased = durationType === 'normal';

  // 時間をピクセル位置に変換
  const hourToPixel = useCallback((hour: number, containerWidth: number): number => {
    if (durationType === 'normal' && normalTimeRange) {
      // normalタイプで時間範囲が設定されている場合、その範囲内で正規化
      const rangeHours = normalTimeRange.endHour - normalTimeRange.startHour;
      const normalizedHour = (hour - normalTimeRange.startHour) / rangeHours;
      return normalizedHour * containerWidth;
    }
    return (hour / 24) * containerWidth;
  }, [durationType, normalTimeRange]);

  // ピクセル位置を時間に変換（スナップ: 15分単位）
  const pixelToHour = useCallback((pixel: number, containerWidth: number): number => {
    let hour: number;
    if (durationType === 'normal' && normalTimeRange) {
      // normalタイプで時間範囲が設定されている場合、その範囲内で正規化
      const rangeHours = normalTimeRange.endHour - normalTimeRange.startHour;
      const normalizedHour = (pixel / containerWidth) * rangeHours;
      hour = normalTimeRange.startHour + normalizedHour;
    } else {
      hour = (pixel / containerWidth) * 24;
    }
    // 15分単位（0.25時間）でスナップ
    return Math.round(hour * 4) / 4;
  }, [durationType, normalTimeRange]);

  // Blockの最小時間（15分 = 0.25時間）を確保
  const ensureMinDuration = useCallback((block: RoutineBlockInput): RoutineBlockInput => {
    const duration = block.endHour - block.startHour;
    const minDuration = 0.25; // 15分
    if (duration < minDuration) {
      // 最小15分を確保
      return {
        ...block,
        endHour: block.startHour + minDuration
      };
    }
    return block;
  }, []);

  // Blockの時間をdurationTypeに応じて制限
  const clampHours = useCallback((block: RoutineBlockInput): RoutineBlockInput => {
    const minDuration = 0.25; // 15分（最短）
    let startHour = Math.max(0, block.startHour);
    let endHour = block.endHour;

    if (durationType === 'normal') {
      // normal: Routine全体の時間範囲内でBlockを配置可能（例：8:00-12:00）
      // 各Blockの最低時間は0.25h（15分）、Routine全体が最低3時間
      if (normalTimeRange) {
        // 時間範囲内に制限
        startHour = Math.max(normalTimeRange.startHour, Math.min(normalTimeRange.endHour, startHour));
        endHour = Math.max(normalTimeRange.startHour, Math.min(normalTimeRange.endHour, endHour));
      } else {
        // 時間範囲が設定されていない場合は0-24の範囲内で自由
        startHour = Math.max(0, Math.min(24, startHour));
        endHour = Math.min(24, endHour);
      }

      // 最低期間（0.25h = 15分）を確保
      if (endHour - startHour < minDuration) {
        if (normalTimeRange) {
          if (startHour + minDuration <= normalTimeRange.endHour) {
            endHour = startHour + minDuration;
          } else {
            startHour = Math.max(normalTimeRange.startHour, endHour - minDuration);
          }
        } else {
          if (startHour + minDuration <= 24) {
            endHour = startHour + minDuration;
          } else {
            startHour = Math.max(0, endHour - minDuration);
          }
        }
      }
    } else {
      // weekly: 24時間超も許可（制限なし、ただし最小15分は確保）
      // 24時を超えた値も保持する（表示時に分割して表示するため）
      startHour = Math.max(0, startHour);
      if (endHour - startHour < minDuration) {
        endHour = startHour + minDuration;
      }

      // weeklyタイプでは24時を超えた値をそのまま保持する（正規化しない）
      // 表示時に`processedBlocks`で分割して表示する
      return {
        ...block,
        startHour,
        endHour
      };
    }

    return {
      ...block,
      startHour,
      endHour
    };
  }, [durationType, normalTimeRange]);

  // 時間ブロックの重複をチェック（除外するブロックIDを指定可能）
  // 重複判定: 同じ曜日で、時間帯が重複する（境界を含む場合も重複とみなす）
  // ロジック: !(end1 <= start2 || start1 >= end2) つまり (start1 < end2 && end1 > start2)
  // ただし、start1 === start2 かつ end1 === end2 の場合も重複とみなす
  const checkBlockOverlap = useCallback((block: RoutineBlockInput, excludeBlockId?: string): boolean => {
    return blocks.some((b) => {
      if (b.id === excludeBlockId) return false; // 自分自身は除外
      if (b.day !== block.day) return false; // 異なる曜日は重複しない

      // 時間帯の重複判定: 同じ時間範囲、または時間が重複する場合
      // 1. 完全に同じ時間範囲: (start1 === start2 && end1 === end2)
      // 2. 部分的に重複: (start1 < end2 && end1 > start2)
      const isSameTimeRange = b.startHour === block.startHour && b.endHour === block.endHour;
      const hasTimeOverlap = b.startHour < block.endHour && b.endHour > block.startHour;
      return isSameTimeRange || hasTimeOverlap;
    });
  }, [blocks]);

  // ドラッグ開始（Block全体を移動）
  const handleDragStart = (e: React.MouseEvent, block: RoutineBlockInput, day?: string) => {
    if (resizingBlockId) return;
    e.preventDefault();
    e.stopPropagation();
    if (!block.id) return;
    setDraggingBlockId(block.id);
    setDraggingBlock(block);
    const targetDay = day || block.day;
    setDragStartDay(targetDay || null);
    setDragStartX(e.clientX);
    setHasDragged(false); // ドラッグ開始時にリセット
  };

  // リサイズ開始（Blockの端をドラッグ）
  const handleResizeStart = (e: React.MouseEvent, block: RoutineBlockInput, side: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    if (!block.id) return;
    setResizingBlockId(block.id);
    setResizeSide(side);
    setResizeStartX(e.clientX);
  };

  // マウス位置からどの曜日のタイムライン上にいるかを検出（Weekly用）
  const detectDayFromMousePosition = useCallback((e: MouseEvent): string | null => {
    if (isDayBased) return null;

    for (const day of weekdayOrder) {
      const timelineEl = timelineRefsByDay.current[day];
      if (!timelineEl) continue;

      const rect = timelineEl.getBoundingClientRect();
      if (
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right
      ) {
        return day;
      }
    }
    return null;
  }, [isDayBased]);

  // マウス移動中
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // ドラッグが発生したことを記録
    if (draggingBlockId || resizingBlockId) {
      setHasDragged(true);
    }

    // リサイズ処理（優先）
    if (resizingBlockId && resizeSide) {
      const block = blocks.find((b) => b.id === resizingBlockId);
      if (!block) return;

      // weeklyの場合は該当する曜日のタイムラインを取得
      let timelineEl: HTMLDivElement | null = null;
      let containerWidth = 0;
      let containerRect: DOMRect | null = null;
      let relativeX = 0;

      if (isDayBased) {
        timelineEl = timelineRef.current;
      } else {
        // weeklyの場合
        timelineEl = timelineRefsByDay.current[block.day] || null;
      }

      if (!timelineEl) return;

      containerWidth = timelineEl.offsetWidth;
      containerRect = timelineEl.getBoundingClientRect();
      relativeX = e.clientX - containerRect.left;

      const currentHour = pixelToHour(relativeX, containerWidth);

      let updated: RoutineBlockInput;
      const minDuration = 0.25; // 15分（最短）
      if (resizeSide === 'left') {
        let maxStartHour = block.endHour - minDuration;
        let minStartHour = 0;
        if (durationType === 'normal') {
          // normal: 時間範囲内に制限
          if (normalTimeRange) {
            maxStartHour = Math.min(normalTimeRange.endHour - minDuration, maxStartHour);
            minStartHour = normalTimeRange.startHour;
          } else {
            maxStartHour = Math.min(24 - minDuration, maxStartHour);
          }
        } else {
          // weekly: 制限なし
          maxStartHour = block.endHour - minDuration;
        }
        const newStartHour = Math.max(minStartHour, Math.min(currentHour, maxStartHour));
        let updatedBlock = {
          ...block,
          startHour: newStartHour
        };

        // weeklyタイプでは24時を超えた値をそのまま保持する（正規化しない）
        // 表示時に`processedBlocks`で分割して表示する
        updated = clampHours(updatedBlock);
      } else {
        let minEndHour = block.startHour + minDuration;
        let maxEndHour = Infinity;
        if (durationType === 'normal') {
          // normal: 時間範囲内に制限
          if (normalTimeRange) {
            maxEndHour = normalTimeRange.endHour;
            minEndHour = Math.max(minEndHour, normalTimeRange.startHour + minDuration);
          } else {
            maxEndHour = 24;
          }
        } else {
          // weekly: 制限なし
          maxEndHour = Infinity;
        }
        const newEndHour = Math.max(minEndHour, Math.min(maxEndHour, currentHour));
        let updatedBlock = {
          ...block,
          endHour: newEndHour
        };

        // weeklyタイプでは24時を超えた値をそのまま保持する（正規化しない）
        // 表示時に`processedBlocks`で分割して表示する
        updated = clampHours(updatedBlock);
      }

      // 重複チェック（必須）
      if (checkBlockOverlap(updated, block.id)) {
        return; // 重複している場合はリサイズを拒否
      }

      const newBlocks = blocks.map((b) => (b.id === block.id ? updated : b));
      onChange(newBlocks);
      return;
    }

    // ドラッグ処理
    if (draggingBlockId && draggingBlock && !isDayBased) {
      // Weeklyの場合: 曜日を跨いでドラッグできるようにする
      const currentDay = detectDayFromMousePosition(e);
      if (currentDay) {
        const timelineEl = timelineRefsByDay.current[currentDay];
        if (timelineEl) {
          const containerWidth = timelineEl.offsetWidth;
          const containerRect = timelineEl.getBoundingClientRect();
          const relativeX = e.clientX - containerRect.left;

          // 元のBlockの期間を保持
          const originalDuration = draggingBlock.endHour - draggingBlock.startHour;

          // 新しい開始時刻を計算（マウス位置に基づく）
          let newStartHour = pixelToHour(relativeX, containerWidth);
          let newEndHour = newStartHour + originalDuration;

          // weeklyの場合は24時間超も許可（制限なし）
          if (durationType === 'weekly') {
            // weekly: 最小15分を確保（時間制限なし）
            if (newEndHour - newStartHour < 0.25) {
              return;
            }

            // weeklyタイプでは24時を超えた値をそのまま保持する（正規化しない）
            // 表示時に`processedBlocks`で分割して表示する
            let updatedBlock: RoutineBlockInput = {
              ...draggingBlock,
              day: currentDay as typeof draggingBlock.day,
              startHour: Math.max(0, newStartHour),
              endHour: newEndHour
            };

            const updated = clampHours(updatedBlock);

            // 重複チェック（必須）
            if (checkBlockOverlap(updated, draggingBlock.id)) {
              return; // 重複している場合は移動を拒否
            }

            const newBlocks = blocks.map((b) => (b.id === draggingBlock.id ? updated : b));
            onChange(newBlocks);
            return;
          } else {
            // normal/normal: 24時間内に制限
            if (newStartHour < 0) {
              newEndHour -= newStartHour;
              newStartHour = 0;
            }
            if (newEndHour > 24) {
              newStartHour -= (newEndHour - 24);
              newEndHour = 24;
            }

            // 最小15分を確保
            if (newEndHour - newStartHour < 0.25) {
              return;
            }

            const updated = clampHours({
              ...draggingBlock,
              day: currentDay as typeof draggingBlock.day,
              startHour: newStartHour,
              endHour: newEndHour
            });

            // 重複チェック（必須）
            if (checkBlockOverlap(updated, draggingBlock.id)) {
              return; // 重複している場合は移動を拒否
            }

            const newBlocks = blocks.map((b) => (b.id === draggingBlock.id ? updated : b));
            onChange(newBlocks);
            return;
          }
        }
      }
    }

    if (draggingBlockId && isDayBased) {
      const timelineEl = timelineRef.current;
      if (!timelineEl) return;

      const containerWidth = timelineEl.offsetWidth;
      const containerRect = timelineEl.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left;

      const block = blocks.find((b) => b.id === draggingBlockId);
      if (!block) return;

      const deltaX = e.clientX - dragStartX;
      const deltaHour = pixelToHour(deltaX, containerWidth);

      // 元のBlockの期間を保持
      const originalDuration = block.endHour - block.startHour;

      // 新しい開始時刻を計算（マウス位置に基づく）
      let newStartHour = pixelToHour(relativeX, containerWidth);
      let newEndHour = newStartHour + originalDuration;

      // isDayBasedの場合はnormalタイプのみ
      if (durationType === 'normal') {
        // normal: 時間範囲内に制限
        if (normalTimeRange) {
          // 時間範囲内に収める
          newStartHour = Math.max(normalTimeRange.startHour, Math.min(normalTimeRange.endHour, newStartHour));
          newEndHour = Math.max(normalTimeRange.startHour, Math.min(normalTimeRange.endHour, newEndHour));
        } else {
          // 時間範囲が設定されていない場合は0-24の範囲内
          newStartHour = Math.max(0, Math.min(24, newStartHour));
          newEndHour = Math.min(24, newEndHour);
        }

        // 最小15分を確保
        if (newEndHour - newStartHour < 0.25) {
          return;
        }

        const updated: RoutineBlockInput = {
          ...block,
          startHour: newStartHour,
          endHour: newEndHour
        };

        // clampHoursで再チェック（確実に範囲内に収める）
        const clampedUpdated = clampHours(updated);

        // 重複チェック（必須）
        if (checkBlockOverlap(clampedUpdated, block.id)) {
          return; // 重複している場合は移動を拒否
        }

        const newBlocks = blocks.map((b) => (b.id === block.id ? clampedUpdated : b));
        onChange(newBlocks);
        return;
      } else {
        // normal: 0-24時間の範囲内で自由に移動可能
        // 24時間の範囲内に収める
        if (newStartHour < 0) {
          newEndHour = originalDuration;
          // 最小15分を確保
          if (newEndHour < 0.25) {
            return;
          }
        } else if (newEndHour > 24) {
          newEndHour = 24;
          // 最小15分を確保
          if (newEndHour - newStartHour < 0.25) {
            return;
          }
        }

        // 最小15分を確保
        if (newEndHour - newStartHour < 0.25) {
          return;
        }

        const updated: RoutineBlockInput = {
          ...block,
          startHour: Math.max(0, Math.min(24, newStartHour)),
          endHour: Math.max(0.25, Math.min(24, newEndHour))
        };

        // 重複チェック（必須）
        if (checkBlockOverlap(updated, block.id)) {
          return; // 重複している場合は移動を拒否
        }

        const newBlocks = blocks.map((b) => (b.id === block.id ? updated : b));
        onChange(newBlocks);
        return;
      }
    }
  }, [draggingBlockId, draggingBlock, resizingBlockId, resizeSide, dragStartX, isDayBased, durationType, normalTimeRange, blocks, onChange, pixelToHour, clampHours, detectDayFromMousePosition, checkBlockOverlap]);

  // マウスアップ（ドラッグ/リサイズ終了）
  const handleMouseUp = useCallback(() => {
    // 少し遅延させてからhasDraggedをリセット（クリックイベントが発火する前に）
    const wasDragging = draggingBlockId !== null || resizingBlockId !== null;
    setDraggingBlockId(null);
    setDraggingBlock(null);
    setDragStartDay(null);
    setResizingBlockId(null);
    setResizeSide(null);

    // ドラッグ/リサイズが発生していた場合は、クリックイベントを無視するために少し待つ
    if (wasDragging) {
      setTimeout(() => {
        setHasDragged(false);
      }, 100);
    } else {
      setHasDragged(false);
    }
  }, [draggingBlockId, resizingBlockId]);

  // イベントリスナーの登録
  useEffect(() => {
    if (draggingBlockId || resizingBlockId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingBlockId, resizingBlockId, handleMouseMove, handleMouseUp]);

  // タイムライン上でクリック/ダブルクリックしてブロックを追加
  const handleTimelineClick = (e: React.MouseEvent, day?: string) => {
    // リサイズ/ドラッグが発生していた場合は新しいBlockを作成しない
    if (hasDragged) {
      return;
    }

    // 既存のブロックがクリックされた場合は編集モーダルを開く（既存の処理）
    if ((e.target as HTMLElement).closest('[data-block-id]')) {
      return;
    }

    const timelineEl = e.currentTarget as HTMLDivElement;
    const rect = timelineEl.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const containerWidth = timelineEl.offsetWidth;
    const hour = pixelToHour(relativeX, containerWidth);

    // クリック位置の時間を15分ブロックとして追加
    const newBlock: RoutineBlockInput = {
      id: `block-${nextBlockIdRef.current++}`,
      day: (day ?? 'monday') as typeof blocks[0]['day'],
      startHour: Math.max(0, hour),
      endHour: hour + 0.25, // 15分（最小）
      label: '',
      objective: '',
      energyLevel: 'medium'
    };

    const validBlock = ensureMinDuration(clampHours(newBlock));

    // 重複チェック
    if (checkBlockOverlap(validBlock)) {
      // 重複している場合は追加しない（視覚的フィードバックは後で実装）
      console.warn('この時間帯には既にブロックが存在します。');
      return;
    }

    onChange([...blocks, validBlock]);
    setEditingBlock(validBlock); // 追加後すぐに編集モーダルを開く
  };

  const handleTimelineDoubleClick = (e: React.MouseEvent, day?: string) => {
    e.preventDefault();
    handleTimelineClick(e, day);
  };

  // Block削除
  const handleDeleteBlock = (blockId: string) => {
    onChange(blocks.filter((b) => b.id !== blockId));
  };

  // Block詳細編集
  const handleSaveBlockEdit = (updated: RoutineBlockInput): void => {
    // weeklyタイプでは24時を超えた値をそのまま保持する（正規化しない）
    // 表示時に`processedBlocks`で分割して表示する
    let validBlock = ensureMinDuration(clampHours(updated));

    // 重複チェック（自分自身を除外）
    if (checkBlockOverlap(validBlock, validBlock.id)) {
      // 重複している場合は保存しない（エラーメッセージは後で実装）
      console.warn('この時間帯には既にブロックが存在します。');
      return;
    }

    const newBlocks = blocks.map((b) => (b.id === validBlock.id ? validBlock : b));
    onChange(newBlocks);
    setEditingBlock(null);
  };

  if (isDayBased) {
    // normal/normal: 1日のタイムライン
    const sortedBlocks = [...blocks].sort((a, b) => a.startHour - b.startHour);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">時間ブロック</h3>
        </div>

        {/* 時間軸 */}
        <div className="relative h-6">
          {(() => {
            // normalタイプで時間範囲が設定されている場合、その範囲内の時間軸を表示
            if (normalTimeRange) {
              const startHour = Math.floor(normalTimeRange.startHour);
              const endHour = Math.ceil(normalTimeRange.endHour);
              const rangeHours = endHour - startHour;
              // 時間軸の間隔を計算（範囲に応じて調整）
              const interval = rangeHours <= 6 ? 1 : rangeHours <= 12 ? 2 : 3; // 6時間以下なら1時間単位、12時間以下なら2時間単位、それ以上なら3時間単位
              const hours: number[] = [];
              for (let h = startHour; h <= endHour; h += interval) {
                hours.push(h);
              }
              // 終了時刻が含まれていない場合は追加
              const lastHour = hours[hours.length - 1];
              if (lastHour !== undefined && lastHour < endHour) {
                hours.push(endHour);
              }
              return hours.map((hour) => {
                const normalizedHour = hour - normalTimeRange.startHour;
                const rangeHours2 = normalTimeRange.endHour - normalTimeRange.startHour;
                const leftPercent = (normalizedHour / rangeHours2) * 100;
                return (
                  <div
                    key={hour}
                    className="absolute text-xs text-muted-foreground font-medium"
                    style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
                  >
                    {hour}
                  </div>
                );
              });
            } else {
              // デフォルト: 0-24時の範囲で3時間間隔
              return Array.from({ length: 9 }, (_, i) => {
                const hour = i * 3;
                return (
                  <div
                    key={hour}
                    className="absolute text-xs text-muted-foreground font-medium"
                    style={{ left: `${(hour / 24) * 100}%`, transform: 'translateX(-50%)' }}
                  >
                    {hour}
                  </div>
                );
              });
            }
          })()}
        </div>

        {/* タイムライン */}
        <div
          ref={timelineRef}
          className="relative h-32 bg-muted/30 rounded-md overflow-visible cursor-pointer"
          onClick={(e) => handleTimelineClick(e)}
          onDoubleClick={(e) => handleTimelineDoubleClick(e)}
        >
          {sortedBlocks.map((block) => {
            // normalタイプで時間範囲が設定されている場合、その範囲内で正規化
            let leftPercent: number;
            let actualWidthPercent: number;
            const actualDuration = block.endHour - block.startHour;
            if (durationType === 'normal' && normalTimeRange) {
              const rangeHours = normalTimeRange.endHour - normalTimeRange.startHour;
              const normalizedStart = (block.startHour - normalTimeRange.startHour) / rangeHours;
              leftPercent = normalizedStart * 100;
              actualWidthPercent = (actualDuration / rangeHours) * 100;
            } else {
              leftPercent = (block.startHour / 24) * 100;
              actualWidthPercent = (actualDuration / 24) * 100;
            }
            const isValid = actualDuration >= 0.25; // 15分（最短）

            const minDisplayWidthPx = 60; // 最小表示幅（ピクセル）
            const finalWidthPercent = actualWidthPercent;

            return (
              <div
                key={block.id}
                className={`absolute top-0 h-full border-2 ${energyLevelColors[block.energyLevel] || energyLevelColors.low} rounded-sm cursor-move transition-all ${!isValid ? 'border-destructive' : ''}`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${finalWidthPercent}%`,
                  minWidth: `${minDisplayWidthPx}px`
                }}
                onMouseDown={(e) => handleDragStart(e, block)}
                onClick={(e) => {
                  // ドラッグが発生した場合は編集モーダルを開かない
                  if (hasDragged) {
                    e.stopPropagation();
                    return;
                  }
                  setEditingBlock(block);
                }}
              >
                {/* リサイズハンドル（左） */}
                <div
                  data-resize-handle="left"
                  className="absolute left-0 top-0 w-3 h-full bg-foreground/20 cursor-ew-resize hover:bg-foreground/40 z-10"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleResizeStart(e, block, 'left');
                  }}
                />

                {/* Block内容 */}
                <div className="flex flex-col justify-center items-center h-full px-2 text-center pointer-events-none">
                  <div className="text-xs font-semibold truncate w-full">{block.label}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatHourToTime(block.startHour)}-{formatHourToTime(block.endHour)}
                  </div>
                </div>

                {/* リサイズハンドル（右） */}
                <div
                  data-resize-handle="right"
                  className="absolute right-0 top-0 w-3 h-full bg-foreground/20 cursor-ew-resize hover:bg-foreground/40 z-10"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleResizeStart(e, block, 'right');
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* ブロック一覧 */}
        <div className="space-y-2">
          {sortedBlocks.map((block) => (
            <div key={block.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <Badge variant="secondary" className="text-xs">
                {formatHourToTime(block.startHour)}-{formatHourToTime(block.endHour)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {energyLevelLabels[block.energyLevel]}
              </Badge>
              <span className="flex-1 text-sm font-medium">{block.label}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingBlock(block)}
              >
                編集
              </Button>
            </div>
          ))}
        </div>

        {/* 編集モーダル */}
        {editingBlock && (
          <BlockEditModal
            key={editingBlock.id ?? `${editingBlock.day}-${editingBlock.startHour}-${editingBlock.endHour}`}
            block={editingBlock}
            durationType={durationType}
            normalTimeRange={normalTimeRange}
            onSave={handleSaveBlockEdit}
            onDelete={handleDeleteBlock}
            onClose={() => setEditingBlock(null)}
          />
        )}
      </div>
    );
  }

  // weekly: 曜日ごとのタイムライン
  // weeklyタイプの場合、24時を超えたBlockを分割して表示
  const processedBlocks = durationType === 'weekly'
    ? blocks.flatMap((block) => {
        // 24時を超えていない場合はそのまま
        if (block.endHour <= 24) {
          return [block];
        }

        // 24時を超えている場合は分割
        // 例：月曜22:00-25:00 → 月曜22:00-24:00 と 火曜0:00-1:00
        // startHourが24未満の場合のみ、前の日の部分を作成
        if (block.startHour < 24) {
          const firstPart: RoutineBlockInput = {
            ...block,
            startHour: block.startHour, // 元のBlockの開始時刻を明示的に保持
            endHour: 24 // その日の終わりまで（24:00）
          };

          const nextDay = getNextDay(block.day);
          const secondPart: RoutineBlockInput = {
            ...block,
            id: `${block.id}-next-day`, // 仮のID（表示用）
            day: nextDay as typeof block.day,
            startHour: 0,
            endHour: block.endHour - 24 // 翌日の0時からの時間（25 - 24 = 1）
          };

          return [firstPart, secondPart];
        } else {
          // startHourが24以上の場合（例：25:00-28:00）は、前の日の部分は不要
          // 次の日の0時から開始するBlockとして正規化
          const days = Math.floor(block.startHour / 24);
          let newDay = block.day as typeof weekdayOrder[number];
          for (let i = 0; i < days; i++) {
            newDay = getNextDay(newDay);
          }

          const normalizedBlock: RoutineBlockInput = {
            ...block,
            day: newDay as typeof block.day,
            startHour: block.startHour % 24,
            endHour: block.endHour - (days * 24)
          };

          // さらにendHourが24を超える場合は再分割
          if (normalizedBlock.endHour > 24) {
            const firstPart: RoutineBlockInput = {
              ...normalizedBlock,
              endHour: 24
            };

            const nextDay = getNextDay(normalizedBlock.day);
            const secondPart: RoutineBlockInput = {
              ...normalizedBlock,
              id: `${normalizedBlock.id}-next-day`,
              day: nextDay as typeof normalizedBlock.day,
              startHour: 0,
              endHour: normalizedBlock.endHour - 24
            };

            return [firstPart, secondPart];
          }

          return [normalizedBlock];
        }
      })
    : blocks;

  const blocksByDay = processedBlocks.reduce(
    (acc, block) => {
      if (!acc[block.day]) {
        acc[block.day] = [];
      }
      acc[block.day]!.push(block);
      return acc;
    },
    {} as Record<string, RoutineBlockInput[]>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">時間ブロック</h3>
      </div>

      <div className="space-y-4">
        {weekdayOrder.map((day) => {
          const dayBlocks = blocksByDay[day] || [];
          const sortedDayBlocks = [...dayBlocks].sort((a, b) => a.startHour - b.startHour);

          return (
            <div key={day} className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground min-w-[2rem]">
                  {weekdayLabels[day]}
                </span>
                <div className="flex-1 space-y-1.5">
                  {/* 時間軸 */}
                  <div className="relative h-5">
                    {Array.from({ length: 9 }, (_, i) => {
                      const hour = i * 3;
                      return (
                        <div
                          key={hour}
                          className="absolute text-xs text-muted-foreground font-medium"
                          style={{ left: `${(hour / 24) * 100}%`, transform: 'translateX(-50%)' }}
                        >
                          {hour}
                        </div>
                      );
                    })}
                  </div>

                  {/* タイムライン */}
                  <div
                    ref={(el) => {
                      timelineRefsByDay.current[day] = el;
                    }}
                    className="relative h-24 bg-muted/30 rounded-md overflow-visible cursor-pointer"
                    onClick={(e) => handleTimelineClick(e, day)}
                    onDoubleClick={(e) => handleTimelineDoubleClick(e, day)}
                  >
                    {sortedDayBlocks.map((block) => {
                      // 分割されたBlock（次の日の部分）の場合は、元のBlockを取得
                      const isSplitBlock = block.id?.includes('-next-day') ?? false;
                      const originalBlockId = isSplitBlock && block.id ? block.id.replace('-next-day', '') : block.id;

                      // firstPartかどうかを判定（endHour === 24 かつ 元のBlockのendHour > 24）
                      const isFirstPart = !isSplitBlock && block.endHour === 24 && blocks.find(b => b.id === block.id)?.endHour && (blocks.find(b => b.id === block.id)!.endHour > 24);

                      // 元のBlockを取得（splitBlockまたはfirstPartの場合は、元のBlockを探す）
                      let originalBlock = block;
                      if (isSplitBlock && originalBlockId) {
                        originalBlock = blocks.find(b => b.id === originalBlockId) || block;
                      } else if (isFirstPart && block.id) {
                        originalBlock = blocks.find(b => b.id === block.id) || block;
                      }

                      const leftPercent = (block.startHour / 24) * 100;
                      const actualDuration = block.endHour - block.startHour;
                      const actualWidthPercent = (actualDuration / 24) * 100;
                      const isValid = actualDuration >= 0.25; // 15分（最短）
                      // 分割されたBlockの場合は重複チェックをスキップ（元のBlockでチェック）
                      const hasOverlap = isSplitBlock || !block.id ? false : checkBlockOverlap(block, block.id);

                      const minDisplayWidthPx = 60; // 最小表示幅（ピクセル）
                      const finalWidthPercent = actualWidthPercent;

                      return (
                        <div
                          key={block.id}
                          data-block-id={isSplitBlock ? originalBlockId : block.id}
                          className={`absolute top-0 h-full border-2 ${energyLevelColors[block.energyLevel] || energyLevelColors.low} rounded-sm cursor-move transition-all ${!isValid || hasOverlap ? 'border-destructive' : ''} ${isSplitBlock ? 'opacity-80' : ''}`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${finalWidthPercent}%`,
                            minWidth: `${minDisplayWidthPx}px`
                          }}
                          onMouseDown={(e) => {
                            // リサイズハンドルがクリックされた場合はドラッグを開始しない
                            if ((e.target as HTMLElement).closest('[data-resize-handle]')) {
                              return;
                            }
                            // 分割されたBlockの場合も、元のBlockをドラッグ
                            handleDragStart(e, originalBlock, day);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // ドラッグが発生した場合は編集モーダルを開かない
                            if (hasDragged) {
                              return;
                            }
                            // 分割されたBlockの場合も、元のBlockを編集
                            setEditingBlock(originalBlock);
                          }}
                        >
                          {/* リサイズハンドル（左） - 分割されたBlockの場合は非表示 */}
                          {!isSplitBlock && (
                            <div
                              data-resize-handle="left"
                              className="absolute left-0 top-0 w-2 h-full bg-foreground/20 cursor-ew-resize hover:bg-foreground/40"
                              onMouseDown={(e) => handleResizeStart(e, originalBlock, 'left')}
                            />
                          )}

                          {/* Block内容 */}
                          <div className="flex flex-col justify-center items-center h-full px-2 text-center pointer-events-none">
                            <div className="text-xs font-semibold truncate w-full">{block.label}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {formatHourToTime(block.startHour)}-{formatHourToTime(block.endHour)}
                            </div>
                          </div>

                          {/* リサイズハンドル（右） */}
                          <div
                            className="absolute right-0 top-0 w-2 h-full bg-foreground/20 cursor-ew-resize hover:bg-foreground/40"
                            onMouseDown={(e) => handleResizeStart(e, block, 'right')}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ブロック一覧 */}
      <div className="space-y-2">
        {blocks.map((block) => (
          <div key={block.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <Badge variant="secondary" className="text-xs">
              {weekdayLabels[block.day]} {formatHourToTime(block.startHour)}-{formatHourToTime(block.endHour)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {energyLevelLabels[block.energyLevel]}
            </Badge>
            <span className="flex-1 text-sm font-medium">{block.label}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingBlock(block)}
            >
              編集
            </Button>
          </div>
        ))}
      </div>

      {/* 編集モーダル */}
        {editingBlock && (
          <BlockEditModal
            block={editingBlock}
            durationType={durationType}
            normalTimeRange={normalTimeRange}
            onSave={handleSaveBlockEdit}
            onDelete={handleDeleteBlock}
            onClose={() => setEditingBlock(null)}
          />
        )}
    </div>
  );
}

// Block編集モーダル
type BlockEditModalProps = {
  block: RoutineBlockInput;
  durationType: 'normal' | 'weekly';
  normalTimeRange?: { startHour: number; endHour: number };
  onSave: (block: RoutineBlockInput) => void;
  onDelete?: (blockId: string) => void;
  onClose: () => void;
};

function BlockEditModal({ block, durationType, normalTimeRange, onSave, onDelete, onClose }: BlockEditModalProps) {
  const [label, setLabel] = useState(block.label);
  const [objective, setObjective] = useState(block.objective);
  const [energyLevel, setEnergyLevel] = useState(block.energyLevel);
  const [day, setDay] = useState(block.day);
  const [startTime, setStartTime] = useState(formatHourToTime(block.startHour));
  const [endHour, setEndHour] = useState(block.endHour);
  const [duration, setDuration] = useState(block.endHour - block.startHour);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [objectiveError, setObjectiveError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const timeOptions = generateTimeOptions();

  // 開始時刻が変更されたときにendHourを自動更新
  const handleStartTimeChange = (timeStr: string) => {
    // 15分刻みに丸める
    const roundedTime = roundTo15Minutes(timeStr);
    setStartTime(roundedTime);
    const newStartHour = parseTimeToHour(roundedTime);
    let validStartHour = Math.max(0, newStartHour);

    if (durationType === 'normal' && normalTimeRange) {
      // normalタイプで時間範囲が設定されている場合、その範囲内に制限
      validStartHour = Math.max(normalTimeRange.startHour, Math.min(normalTimeRange.endHour, newStartHour));
    } else if (durationType !== 'weekly') {
      // normalタイプで時間範囲が設定されていない場合は24時間まで
      validStartHour = Math.min(24, validStartHour);
    }

    let newEndHour = validStartHour + duration;

    if (durationType === 'normal' && normalTimeRange) {
      // normalタイプで時間範囲が設定されている場合、その範囲内に制限
      newEndHour = Math.min(normalTimeRange.endHour, newEndHour);
    } else if (durationType !== 'weekly') {
      // normalタイプで時間範囲が設定されていない場合は24時間まで
      newEndHour = Math.min(24, newEndHour);
    }

    setEndHour(newEndHour);
  };

  // 長さが変更されたときにendHourを自動更新
  const handleDurationChange = (newDuration: number) => {
    const minDuration = 0.25; // 15分（最短）
    let maxDuration: number;

    if (durationType === 'normal') {
      maxDuration = 24; // normal: 1日未満（24時間未満）
    } else {
      maxDuration = Infinity; // weekly: 制限なし
    }

    const validDuration = Math.max(minDuration, Math.min(maxDuration, newDuration));
    setDuration(validDuration);
    setDurationError(null);

    const currentStartHour = parseTimeToHour(startTime);
    let newEndHour = currentStartHour + validDuration;

    // normal/normalの場合は24時間まで
    if (durationType !== 'weekly') {
      newEndHour = Math.min(24, newEndHour);
    }

    setEndHour(newEndHour);
  };

  const handleSave = () => {
    // ラベルのバリデーション
    if (!label || label.trim().length === 0) {
      setLabelError('Blockの名前は必須です');
      return;
    }
    if (label.length > 80) {
      setLabelError('Blockの名前は80文字以下である必要があります');
      return;
    }
    setLabelError(null);

    // 目的のバリデーション
    if (!objective || objective.trim().length === 0) {
      setObjectiveError('ブロックの目的は必須です');
      return;
    }
    if (objective.length > 240) {
      setObjectiveError('ブロックの目的は240文字以下である必要があります');
      return;
    }
    setObjectiveError(null);

    // 最小15分を確保
    const minDuration = 0.25;
    let maxDuration: number;

    if (durationType === 'normal') {
      maxDuration = 24; // 1日未満（24時間未満）
    } else {
      maxDuration = Infinity;
    }

    if (!Number.isFinite(duration) || duration < minDuration) {
      setDurationError('ブロックの長さは15分以上必要です');
      return;
    }
    setDurationError(null);

    const validDuration = Math.max(minDuration, Math.min(maxDuration, duration));
    const currentStartHour = parseTimeToHour(startTime);
    let validEndHour = currentStartHour + validDuration;
    let validStartHour = Math.max(0, currentStartHour);

    if (durationType === 'normal' && normalTimeRange) {
      // normalタイプで時間範囲が設定されている場合、その範囲内に制限
      validStartHour = Math.max(normalTimeRange.startHour, Math.min(normalTimeRange.endHour, currentStartHour));
      validEndHour = Math.max(normalTimeRange.startHour, Math.min(normalTimeRange.endHour, validEndHour));
      // 最小期間を確保
      if (validEndHour - validStartHour < minDuration) {
        if (validStartHour + minDuration <= normalTimeRange.endHour) {
          validEndHour = validStartHour + minDuration;
        } else {
          validStartHour = Math.max(normalTimeRange.startHour, validEndHour - minDuration);
        }
      }
    } else if (durationType !== 'weekly') {
      // normalタイプで時間範囲が設定されていない場合は24時間まで
      validStartHour = Math.min(24, validStartHour);
      validEndHour = Math.min(24, validEndHour);
    }

    onSave({
      ...block,
      label,
      objective,
      energyLevel: energyLevel as 'low' | 'medium' | 'high',
      day: day as typeof block.day,
      startHour: validStartHour,
      endHour: validEndHour
    });
  };

  const handleDelete = () => {
    if (onDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(block.id!);
      onClose();
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Modal
      open={true}
      onClose={onClose}
      title="ブロックを編集"
      size="md"
      footer={
        <div className="flex justify-between gap-2">
          <div>
            {onDelete && (
              <Button variant="destructive" onClick={handleDelete}>
                削除
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-label">ラベル</Label>
          <Input
            id="edit-label"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setLabelError(null);
            }}
            placeholder="Blockの名前（必須）"
            required
          />
          {labelError && (
            <p className="text-sm text-destructive">{labelError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-objective">目的</Label>
          <Input
            id="edit-objective"
            value={objective}
            onChange={(e) => {
              setObjective(e.target.value);
              setObjectiveError(null);
            }}
            placeholder="目的を入力してください"
            required
          />
          {objectiveError && (
            <p className="text-sm text-destructive">{objectiveError}</p>
          )}
        </div>

        {durationType === 'weekly' && (
          <div className="space-y-2">
            <Label htmlFor="edit-day">曜日</Label>
            <select
              id="edit-day"
              value={day}
              onChange={(e) => setDay(e.target.value as typeof block.day)}
              className="relative h-11 w-full rounded-lg border-2 border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {weekdayOrder.map((d) => (
                <option key={d} value={d}>
                  {weekdayLabels[d]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="edit-start-hour">開始時間</Label>
            <select
              id="edit-start-hour"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              required
              className="h-11 w-full rounded-lg border-2 border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring/50 focus-visible:shadow-lg focus-visible:shadow-ring/20"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col space-y-2">
            <Label htmlFor="edit-duration">長さ（時間）</Label>
            <Input
              id="edit-duration"
              type="number"
              step="0.25"
              min={0.25}
              max={durationType === 'normal' ? 24 : undefined}
              value={duration}
              onChange={(e) => handleDurationChange(Number(e.target.value))}
              required
              className="h-11 w-full rounded-lg border-2 border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring/50 focus-visible:shadow-lg focus-visible:shadow-ring/20"
            />
            {durationError && (
              <p className="text-sm text-destructive">{durationError}</p>
            )}
          </div>
          <div className="flex flex-col space-y-2">
            <Label htmlFor="edit-end-hour">終了時間</Label>
            <Input
              id="edit-end-hour"
              type="text"
              value={formatHourToTime(endHour)}
              readOnly
              className="h-11 w-full rounded-lg border-2 border-input bg-muted px-4 py-2.5 text-sm text-foreground cursor-not-allowed"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-energy">エネルギーレベル</Label>
          <select
            id="edit-energy"
            value={energyLevel}
            onChange={(e) => setEnergyLevel(e.target.value as 'low' | 'medium' | 'high')}
            className="relative h-11 w-full rounded-lg border-2 border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
      </div>
    </Modal>

    {/* 削除確認モーダル */}
    {showDeleteConfirm && (
      <Modal
        open={true}
        onClose={handleCancelDelete}
        title="ブロックを削除"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelDelete}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              削除する
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            このブロック「{block.label || '(名前なし)'}」を削除しますか？
          </p>
          <p className="text-xs text-muted-foreground">
            この操作は取り消せません。
          </p>
        </div>
      </Modal>
    )}
    </>
  );
}
