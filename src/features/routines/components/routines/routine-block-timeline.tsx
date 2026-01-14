import type { RoutineDetailView } from '@/features/routines';

const weekdayOrder: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

const weekdayLabel: Record<string, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday'
};

export function RoutineBlockTimeline({ blocks }: { blocks: RoutineDetailView['timeBlocks'] }) {
  const grouped = new Map<string, RoutineDetailView['timeBlocks']>();
  blocks.forEach((block) => {
    const existing = grouped.get(block.day) ?? [];
    grouped.set(block.day, [...existing, block]);
  });

  const sortedDays = Array.from(grouped.keys()).sort(
    (a, b) => (weekdayOrder[a] ?? 0) - (weekdayOrder[b] ?? 0)
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sortedDays.map((day) => {
        const events = grouped.get(day) ?? [];
        return (
          <div key={day} className="space-y-3 rounded-2xl border border-border/50 bg-card/20 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {weekdayLabel[day] ?? day}
            </h4>
            <div className="space-y-3">
              {events
                .slice()
                .sort((a, b) => a.startHour - b.startHour)
                .map((block) => (
                  <div key={block.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{block.label}</span>
                      <span>
                        {block.startHour}:00 – {block.endHour}:00
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{block.objective}</p>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
