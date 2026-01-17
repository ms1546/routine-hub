'use client';

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

const energyLevelColors: Record<string, string> = {
  high: 'bg-warning/30 border-warning/60',
  medium: 'bg-primary/30 border-primary/60',
  low: 'bg-muted/50 border-border'
};

type RoutineScheduleVisualizationProps = {
  timeBlocks: RoutineDetailView['timeBlocks'];
  durationType?: 'half-day' | 'full-day' | 'weekly';
  className?: string;
  compact?: boolean; // コンパクトモード（レジェンドと詳細情報を非表示）
};

export function RoutineScheduleVisualization({
  timeBlocks,
  durationType,
  className,
  compact = false
}: RoutineScheduleVisualizationProps) {
  // full-dayやhalf-dayの場合は曜日表示なし（1日のタイムラインのみ）
  const isDayBased = durationType === 'full-day' || durationType === 'half-day';

  if (isDayBased) {
    // full-dayやhalf-day: 曜日表示なし、1日のタイムラインのみ
    return (
      <div className={className}>
        <div className="space-y-2.5">
          <div className="space-y-1.5">
            <div className="relative h-8 bg-muted/30 rounded-md overflow-hidden">
              {timeBlocks.map((block) => {
                const leftPercent = (block.startHour / 24) * 100;
                const widthPercent = ((block.endHour - block.startHour) / 24) * 100;
                return (
                  <div
                    key={block.id}
                    className={`absolute h-full border ${energyLevelColors[block.energyLevel] || energyLevelColors.low} rounded-sm`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`
                    }}
                    title={`${block.label}: ${block.startHour}:00-${block.endHour}:00`}
                  />
                );
              })}
            </div>
            {!compact && (
              <div className="flex flex-wrap gap-2 text-xs">
                {timeBlocks.map((block) => (
                  <div key={block.id} className="flex items-center gap-1.5">
                    <div
                      className={`h-2.5 w-2.5 rounded-sm border ${energyLevelColors[block.energyLevel] || energyLevelColors.low}`}
                    />
                    <span className="text-muted-foreground">
                      {block.startHour}:00-{block.endHour}:00
                    </span>
                    <span className="font-medium text-foreground">{block.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {!compact && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm border bg-warning/30 border-warning/60" />
              <span>高エネルギー</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm border bg-primary/30 border-primary/60" />
              <span>中エネルギー</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm border bg-muted/50 border-border" />
              <span>低エネルギー</span>
            </div>
          </div>
        )}
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
      <div className="space-y-2.5">
        {sortedDays.map((day) => {
          const dayBlocks = blocksByDay[day] ?? [];
          return (
            <div key={day} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground min-w-[2rem]">
                  {weekdayLabels[day] || day}
                </span>
                <div className="flex-1 relative h-8 bg-muted/30 rounded-md overflow-hidden">
                  {dayBlocks.map((block) => {
                    const leftPercent = (block.startHour / 24) * 100;
                    const widthPercent = ((block.endHour - block.startHour) / 24) * 100;
                    return (
                      <div
                        key={block.id}
                        className={`absolute h-full border ${energyLevelColors[block.energyLevel] || energyLevelColors.low} rounded-sm`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`
                        }}
                        title={`${block.label}: ${block.startHour}:00-${block.endHour}:00`}
                      />
                    );
                  })}
                </div>
              </div>
              {!compact && (
                <div className="ml-[4.5rem] flex flex-wrap gap-2 text-xs">
                  {dayBlocks.map((block) => (
                    <div key={block.id} className="flex items-center gap-1.5">
                      <div
                        className={`h-2.5 w-2.5 rounded-sm border ${energyLevelColors[block.energyLevel] || energyLevelColors.low}`}
                      />
                      <span className="text-muted-foreground">
                        {block.startHour}:00-{block.endHour}:00
                      </span>
                      <span className="font-medium text-foreground">{block.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!compact && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm border bg-warning/30 border-warning/60" />
            <span>高エネルギー</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm border bg-primary/30 border-primary/60" />
            <span>中エネルギー</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm border bg-muted/50 border-border" />
            <span>低エネルギー</span>
          </div>
        </div>
      )}
    </div>
  );
}
