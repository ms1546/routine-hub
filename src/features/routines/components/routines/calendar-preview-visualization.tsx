'use client';

import type { ProposedCalendarEvent, CalendarEvent } from '@/features/calendar/domain/types';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';

type CalendarPreviewVisualizationProps = {
  proposedEvents: ProposedCalendarEvent[];
  existingEvents: CalendarEvent[];
  selectedIds?: string[];
};

const energyLevelColors: Record<string, string> = {
  high: 'bg-warning/40 border-warning/70',
  medium: 'bg-primary/40 border-primary/70',
  low: 'bg-muted/60 border-border/80'
};

const conflictColor = 'bg-destructive/20 border-destructive/50';

export function CalendarPreviewVisualization({
  proposedEvents,
  existingEvents,
  selectedIds = []
}: CalendarPreviewVisualizationProps) {
  // 日付ごとにイベントをグループ化
  const eventsByDate = new Map<string, { proposed: ProposedCalendarEvent[]; existing: CalendarEvent[] }>();

  // 提案イベントを日付ごとにグループ化
  proposedEvents.forEach((event) => {
    const dateKey = new Date(event.start).toISOString().split('T')[0];
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, { proposed: [], existing: [] });
    }
    eventsByDate.get(dateKey)!.proposed.push(event);
  });

  // 既存イベントを日付ごとにグループ化
  existingEvents.forEach((event) => {
    const dateKey = new Date(event.start).toISOString().split('T')[0];
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, { proposed: [], existing: [] });
    }
    eventsByDate.get(dateKey)!.existing.push(event);
  });

  // 日付順にソート
  const sortedDates = Array.from(eventsByDate.keys()).sort();

  // 時間の重複チェック
  const hasTimeConflict = (proposed: ProposedCalendarEvent, existing: CalendarEvent[]): boolean => {
    const proposedStart = new Date(proposed.start);
    const proposedEnd = new Date(proposed.end);
    return existing.some((ex) => {
      const exStart = new Date(ex.start);
      const exEnd = new Date(ex.end);
      return (
        (proposedStart >= exStart && proposedStart < exEnd) ||
        (proposedEnd > exStart && proposedEnd <= exEnd) ||
        (proposedStart <= exStart && proposedEnd >= exEnd)
      );
    });
  };

  return (
    <div className="space-y-6">
      {sortedDates.map((dateKey) => {
        const { proposed, existing } = eventsByDate.get(dateKey)!;
        const date = new Date(dateKey);
        const dateLabel = date.toLocaleDateString('ja-JP', {
          month: 'long',
          day: 'numeric',
          weekday: 'short'
        });

        return (
          <Card key={dateKey} className="p-4">
            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-foreground mb-1">{dateLabel}</h5>
                <p className="text-xs text-muted-foreground">
                  {proposed.length}件の提案イベント {existing.length > 0 && `· ${existing.length}件の既存イベント`}
                </p>
              </div>

              {/* 24時間タイムライン */}
              <div className="space-y-3">
                <div className="relative h-64 bg-muted/20 rounded-lg border border-border/50 p-2">
                  {/* 時間目盛り */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={i}
                        className="flex-1 border-r border-border/30 text-[10px] text-muted-foreground pt-1 pl-1"
                      >
                        {i}
                      </div>
                    ))}
                  </div>

                  {/* 既存イベント（背景に表示） */}
                  <div className="absolute inset-2 flex">
                    {existing.map((event) => {
                      const eventStart = new Date(event.start);
                      const eventEnd = new Date(event.end);
                      const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
                      const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;
                      const leftPercent = (startHour / 24) * 100;
                      const widthPercent = ((endHour - startHour) / 24) * 100;

                      return (
                        <div
                          key={event.id}
                          className="absolute h-full border-2 border-dashed border-muted-foreground/40 bg-muted-foreground/10 rounded"
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            top: '10%',
                            height: '20%'
                          }}
                          title={`既存: ${event.title} (${startHour.toFixed(1)}h - ${endHour.toFixed(1)}h)`}
                        />
                      );
                    })}
                  </div>

                  {/* 提案イベント */}
                  <div className="absolute inset-2 flex flex-col gap-1">
                    {proposed.map((event, idx) => {
                      const eventStart = new Date(event.start);
                      const eventEnd = new Date(event.end);
                      const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
                      const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;
                      const leftPercent = (startHour / 24) * 100;
                      const widthPercent = ((endHour - startHour) / 24) * 100;
                      const isSelected = selectedIds.includes(event.proposalId);
                      const hasConflict = hasTimeConflict(event, existing);
                      const energyLevel = 'medium'; // デフォルト（提案イベントから取得できない場合はmedium）

                      return (
                        <div
                          key={event.proposalId}
                          className={`absolute h-8 border-2 rounded transition-all ${
                            hasConflict
                              ? conflictColor
                              : isSelected
                                ? energyLevelColors[energyLevel]
                                : `${energyLevelColors[energyLevel]} opacity-50`
                          } ${hasConflict ? 'ring-2 ring-destructive/50' : ''}`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            top: `${idx * 40 + 10}px`
                          }}
                          title={`${event.title} (${startHour.toFixed(1)}h - ${endHour.toFixed(1)}h)${hasConflict ? ' [重複]' : ''}`}
                        >
                          <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
                            <span className="text-[10px] font-medium text-foreground truncate">{event.title}</span>
                            {hasConflict && (
                              <Badge variant="destructive" className="ml-auto text-[8px] px-1 py-0">
                                重複
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* イベント詳細リスト */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  {proposed.map((event) => {
                    const isSelected = selectedIds.includes(event.proposalId);
                    const hasConflict = hasTimeConflict(event, existing);
                    const eventStart = new Date(event.start);
                    const eventEnd = new Date(event.end);

                    return (
                      <div
                        key={event.proposalId}
                        className={`flex items-start gap-3 p-2 rounded-lg border transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/20'
                        } ${hasConflict ? 'border-destructive/50 bg-destructive/5' : ''}`}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{event.title}</span>
                            {hasConflict && <Badge variant="destructive" className="text-xs">重複</Badge>}
                            {!isSelected && <Badge variant="outline" className="text-xs">未選択</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {eventStart.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} →{' '}
                            {eventEnd.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
