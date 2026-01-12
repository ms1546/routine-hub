import type { Routine } from '@/lib/routines';

export type UserProfileContext = {
  timezone: string;
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
  intent: string;
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
