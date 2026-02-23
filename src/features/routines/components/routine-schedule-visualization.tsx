'use client';

import { useState } from 'react';
import type { RoutineDetailView } from '@/features/routines';

const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const weekdayLabels: Record<string, string> = {
  monday: '月',
  tuesday: '火',
  wednesday: '水',
  thursday: '木',
  friday: '金',
  saturday: '土',
  sunday: '日'
};

// WCAG 2.1 AA準拠の高コントラスト色（背景とのコントラスト比4.5:1以上）
const energyLevelColors: Record<string, string> = {
  high: 'bg-warning/60 border-warning/90', // 高エネルギー：より濃いアンバー
  medium: 'bg-primary/60 border-primary/90', // 中エネルギー：より濃いインディゴ
  low: 'bg-muted-foreground/20 border-muted-foreground/40' // 低エネルギー：より濃いグレー
};

const energyLevelLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高'
};

/** 小数時間を時刻表記に変換（例: 17.5 → "17:30", 20.25 → "20:15"） */
function formatHourToTime(hour: number): string {
  const h = Math.floor(hour);
  const minutes = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

type RoutineScheduleVisualizationProps = {
  timeBlocks: RoutineDetailView['timeBlocks'];
  durationType?: 'normal' | 'weekly';
  className?: string;
  compact?: boolean; // コンパクトモード（レジェンドと詳細情報を非表示）
};

export function RoutineScheduleVisualization({
  timeBlocks,
  durationType,
  className,
  compact = false
}: RoutineScheduleVisualizationProps) {
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

  // normalの場合は曜日表示なし（1日のタイムラインのみ）
  const isDayBased = durationType === 'normal';

  if (isDayBased) {
    // normal: 時間軸を表示し、Blockを1行に並べて表示
    // 時間順にソート
    const sortedBlocks = [...timeBlocks].sort((a, b) => a.startHour - b.startHour);
    const rangeStart = Math.min(...sortedBlocks.map((block) => block.startHour));
    const rangeEnd = Math.max(...sortedBlocks.map((block) => block.endHour));
    const rangeHours = Math.max(1, rangeEnd - rangeStart);
    const axisStart = Math.floor(rangeStart);
    const axisEnd = Math.ceil(rangeEnd);
    const axisRange = Math.max(1, axisEnd - axisStart);
    const axisInterval = axisRange <= 6 ? 1 : axisRange <= 12 ? 2 : 3;

    return (
      <div className={`${className} w-full min-w-0 overflow-visible`}>
        <div className="space-y-4 overflow-visible w-full">
          <div className="space-y-1.5 overflow-visible w-full min-w-0">
            {/* 時間軸 - 3時間ごとに表示 */}
            <div className="relative w-full h-5">
              {Array.from({ length: Math.floor(axisRange / axisInterval) + 1 }, (_, i) => {
                const hour = axisStart + i * axisInterval;
                return (
                  <div
                    key={hour}
                    className="absolute text-xs text-muted-foreground font-medium"
                    style={{
                      left: `${((hour - axisStart) / axisRange) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {hour}
                  </div>
                );
              })}
            </div>
            {/* タイムライン（w-full で幅を明示し、ブロックを横一列に表示） */}
            <div className={`relative w-full min-w-0 bg-muted/30 rounded-md ${compact ? 'h-16 overflow-hidden' : 'h-24'} overflow-visible`}>
              {sortedBlocks.map((block) => {
                const leftPercent = ((block.startHour - rangeStart) / rangeHours) * 100;
                const widthPercent = ((block.endHour - block.startHour) / rangeHours) * 100;
                const isHovered = hoveredBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    className={`absolute top-0 h-full border-2 ${energyLevelColors[block.energyLevel] || energyLevelColors.low} rounded-sm transition-all hover:z-30 flex flex-col justify-center items-center ${compact ? 'p-1.5' : 'p-2.5'}`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`
                    }}
                    onMouseEnter={() => setHoveredBlockId(block.id)}
                    onMouseLeave={() => setHoveredBlockId(null)}
                  >
                    {/* 常時表示：Block名と時間のみ */}
                    <div className="flex flex-col items-center justify-center min-w-0 text-center pointer-events-none">
                      <div className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-foreground truncate w-full leading-tight mb-1`}>
                        {block.label}
                      </div>
                      <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground leading-tight`}>
                        {formatHourToTime(block.startHour)}-{formatHourToTime(block.endHour)}
                      </div>
                    </div>

                    {/* 詳細画面のみ：ホバー時のツールチップ（吹き出し） - このBlockのみ表示 */}
                    {!compact && (
                      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 transition-opacity z-40 w-72 p-4 rounded-lg border-2 border-border bg-card shadow-2xl text-sm space-y-2.5 ${isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                        <div className="font-bold text-foreground text-base">{block.label}</div>
                        <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">{block.objective}</div>
                        <div className="text-muted-foreground pt-2 border-t border-border/50 font-semibold text-sm">
                          {formatHourToTime(block.startHour)} - {formatHourToTime(block.endHour)}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          エネルギーレベル: <span className="font-semibold">{energyLevelLabels[block.energyLevel] || block.energyLevel}</span>
                        </div>
                        {/* 吹き出しの矢印 */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                          <div className="w-4 h-4 border-r-2 border-b-2 border-border bg-card transform rotate-45"></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* レジェンド */}
          {!compact && (
            <div className="pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm border-2 bg-warning/60 border-warning/90" />
                <span>高エネルギー</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm border-2 bg-primary/60 border-primary/90" />
                <span>中エネルギー</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm border-2 bg-muted-foreground/20 border-muted-foreground/40" />
                <span>低エネルギー</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // weekly: 曜日ごとにグループ化して表示
  const blocksByDay = timeBlocks.reduce(
    (acc, block) => {
      if (!acc[block.day]) {
        acc[block.day] = [];
      }
      acc[block.day]!.push(block);
      return acc;
    },
    {} as Record<string, typeof timeBlocks>
  );

  // 曜日順にソート
  const sortedDays = weekdayOrder.filter((day) => blocksByDay[day] && blocksByDay[day]!.length > 0);

  if (sortedDays.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {sortedDays.map((day) => {
          const dayBlocks = blocksByDay[day] ?? [];
          return (
            <div key={day} className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground min-w-[2rem]">
                    {weekdayLabels[day] || day}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    {/* 時間軸 - 3時間ごとに表示 */}
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
                    {/* タイムライン（w-full で幅を明示し、ブロックを横一列に表示） */}
                    <div className={`relative w-full min-w-0 bg-muted/30 rounded-md ${compact ? 'h-16 overflow-hidden' : 'h-24'} overflow-visible`}>
                      {dayBlocks.map((block) => {
                        const leftPercent = (block.startHour / 24) * 100;
                        const widthPercent = ((block.endHour - block.startHour) / 24) * 100;
                        const isHovered = hoveredBlockId === block.id;
                        return (
                          <div
                            key={block.id}
                            className={`absolute top-0 h-full border-2 ${energyLevelColors[block.energyLevel] || energyLevelColors.low} rounded-sm transition-all hover:z-30 relative flex flex-col justify-center items-center ${compact ? 'p-1.5' : 'p-2.5'}`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`
                            }}
                            onMouseEnter={() => setHoveredBlockId(block.id)}
                            onMouseLeave={() => setHoveredBlockId(null)}
                          >
                            {/* 常時表示：Block名と時間のみ（ブロック内中央） */}
                            <div className="flex flex-col items-center justify-center min-w-0 text-center pointer-events-none">
                              <div className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-foreground truncate w-full leading-tight mb-1`}>
                                {block.label}
                              </div>
                              <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground leading-tight`}>
                                {formatHourToTime(block.startHour)}-{formatHourToTime(block.endHour)}
                              </div>
                            </div>

                            {/* 詳細画面のみ：ホバー時のツールチップ（吹き出し） - このBlockのみ表示 */}
                            {!compact && (
                              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 transition-opacity z-40 w-72 p-4 rounded-lg border-2 border-border bg-card shadow-2xl text-sm space-y-2.5 ${isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                                <div className="font-bold text-foreground text-base">{block.label}</div>
                                <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">{block.objective}</div>
                                <div className="text-muted-foreground pt-2 border-t border-border/50 font-semibold text-sm">
                                  {formatHourToTime(block.startHour)} - {formatHourToTime(block.endHour)}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  エネルギーレベル: <span className="font-semibold">{energyLevelLabels[block.energyLevel] || block.energyLevel}</span>
                                </div>
                                {/* 吹き出しの矢印 */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                                  <div className="w-4 h-4 border-r-2 border-b-2 border-border bg-card transform rotate-45"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!compact && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm border-2 bg-warning/60 border-warning/90" />
            <span>高エネルギー</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm border-2 bg-primary/60 border-primary/90" />
            <span>中エネルギー</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm border-2 bg-muted-foreground/20 border-muted-foreground/40" />
            <span>低エネルギー</span>
          </div>
        </div>
      )}
    </div>
  );
}
