import type { Routine } from '@/lib/routines';

export type RoutineInsight = {
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'success';
};

const severityByIntensity: Record<string, RoutineInsight['severity']> = {
  light: 'success',
  steady: 'info',
  immersive: 'warning'
};

export const generateRoutineInsights = async (routine: Routine): Promise<RoutineInsight[]> => {
  const totalHours = routine.timeBlocks.reduce((acc, block) => acc + (block.endHour - block.startHour), 0);
  const blockSpread = new Set(routine.timeBlocks.map((block) => block.day)).size;
  const intensity = totalHours <= 6 ? 'light' : totalHours <= 16 ? 'steady' : 'immersive';
  const severity = severityByIntensity[intensity] ?? 'info';

  return [
    {
      title: 'Load & Recovery Balance',
      body: `This routine occupies ${totalHours} hours across ${blockSpread} distinct day(s). Encourage users to leave at least one buffer day between applications.`,
      severity
    },
    {
      title: 'Conflict Watchlist',
      body: 'Google Calendar will remain the source of truth. Flag day-of conflicts instead of overwriting what already exists.',
      severity: 'warning'
    },
    {
      title: 'AI Guardrails',
      body: 'LLM suggestions must ask for confirmation. Remind users that assistants cannot finalize schedules automatically.',
      severity: 'info'
    }
  ];
};
