'use client';

import type { RoutineDetailView } from '@/features/routines';

// WCAG 2.1 AA準拠の高コントラスト色（背景とのコントラスト比4.5:1以上）
const energyLevelColors: Record<string, string> = {
  high: 'bg-warning/60 border-warning/90', // 高エネルギー：より濃いアンバー
  medium: 'bg-primary/60 border-primary/90', // 中エネルギー：より濃いインディゴ
  low: 'bg-muted-foreground/20 border-muted-foreground/40' // 低エネルギー：より濃いグレー
};

type RoutineScheduleVisualizationCompactProps = {
  timeBlocks: RoutineDetailView['timeBlocks'];
  durationType?: 'normal' | 'normal' | 'weekly';
  className?: string;
};

/**
 * main画面用のコンパクトなスケジュール可視化
 * Block名や時間の表示なし、Blockの色とサイズのみ表示
 */
export function RoutineScheduleVisualizationCompact({
  timeBlocks,
  durationType,
  className
}: RoutineScheduleVisualizationCompactProps) {
  // normalの場合は曜日表示なし（1日のタイムラインのみ）
  const isDayBased = durationType === 'normal';

  if (isDayBased) {
    // normalやnormal: 曜日表示なし、1日のタイムラインのみ
    return (
      <div className={className}>
        <div className="relative h-12 bg-muted/30 rounded-md overflow-hidden">
          {timeBlocks.map((block) => {
            const leftPercent = (block.startHour / 24) * 100;
            const widthPercent = ((block.endHour - block.startHour) / 24) * 100;
            return (
              <div
                key={block.id}
                className={`absolute top-0 h-full border-2 ${energyLevelColors[block.energyLevel] || energyLevelColors.low} rounded-sm transition-all hover:opacity-80`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // weekly: 曜日ごとにグループ化して表示
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
      <div className="space-y-3">
        {sortedDays.map((day) => {
          const dayBlocks = blocksByDay[day] ?? [];
          return (
            <div key={day} className="flex items-center gap-3">
              <span className="text-xs font-medium text-foreground min-w-[1.5rem]">
                {weekdayLabels[day] || day}
              </span>
              <div className="relative flex-1 h-12 bg-muted/30 rounded-md overflow-hidden">
                {dayBlocks.map((block) => {
                  const leftPercent = (block.startHour / 24) * 100;
                  const widthPercent = ((block.endHour - block.startHour) / 24) * 100;
                  return (
                    <div
                      key={block.id}
                      className={`absolute top-0 h-full border-2 ${energyLevelColors[block.energyLevel] || energyLevelColors.low} rounded-sm transition-all hover:opacity-80`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
