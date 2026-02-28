import type { Routine } from '@/features/routines';

export type UserProfileContext = {
  timezone: string;
  /** 必要睡眠時間（時間）。AIカスタマイズで就寝・早起き回避等に利用 */
  requiredSleepHours?: number;
  /** イベントを入れたい最早時刻（HH:mm）。これより前は避ける */
  preferredWorkStartTime?: string;
  /** イベントを入れたい最遅時刻（HH:mm）。これより後は避ける */
  preferredWorkEndTime?: string;
  /** 連続イベント間の最小休憩（分） */
  minBreakBetweenMinutes?: number;
  priorities: string[];
  constraints: string[];
  energyLevel: 'low' | 'medium' | 'high';
};

export type CalendarWindow = {
  startDate: string; // ISO date
  endDate: string; // ISO date
};

export type RoutineAiWorkflowInput = {
  routine: Routine;
  user: UserProfileContext;
  calendarWindow: CalendarWindow;
};

export type RoutineAiWorkflowOptions = {
  traceId?: string;
};

export interface RoutineAiWorkflowRunner {
  run(input: RoutineAiWorkflowInput, options?: RoutineAiWorkflowOptions): Promise<RoutineAiWorkflowResult>;
}

export type AgentResult<TData> = {
  agent: string;
  generatedAt: string;
  data: TData;
};

export type ProfileAgentData = {
  persona: string;
  highlightedConstraints: string[];
  toneGuidance: string;
};

export type InterpretationAgentData = {
  intent: string[];
  successSignals: string[];
  riskSignals: string[];
};

export type ConflictAgentData = {
  conflicts: Array<{
    id: string;
    label: string;
    severity: 'low' | 'medium' | 'high';
    rationale: string;
  }>;
  assumptions: string[];
};

export type OptimizationAgentData = {
  proposals: Array<{
    id: string;
    title: string;
    description: string;
    tradeOffs: string[];
    aiOnly: boolean;
  }>;
};

export type FutureSimulationData = {
  outlook: string;
  guardrails: string[];
  followUpQuestions: string[];
};

export type RoutineAiWorkflowResult = {
  profile: AgentResult<ProfileAgentData>;
  interpretation: AgentResult<InterpretationAgentData>;
  conflicts: AgentResult<ConflictAgentData>;
  optimizations: AgentResult<OptimizationAgentData>;
  futureSimulation: AgentResult<FutureSimulationData>;
  evaluation: AgentResult<JudgeEvaluation>;
  meta: {
    executionId: string;
    mastraTraceId: string;
    proposalsOnly: true;
    langfuseTraceId: string | null;
  };
};

export type JudgeEvaluationDimension = {
  score: number;
  rationale: string;
};

export type JudgeEvaluation = {
  clarity: JudgeEvaluationDimension;
  consistency: JudgeEvaluationDimension;
  explanationQuality: JudgeEvaluationDimension;
  verdict: 'approve' | 'revise';
};
