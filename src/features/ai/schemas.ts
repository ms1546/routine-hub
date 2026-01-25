import { z } from 'zod';

export const profileAgentDataSchema = z.object({
  persona: z.string(),
  highlightedConstraints: z.array(z.string()),
  toneGuidance: z.string()
});

export const interpretationAgentDataSchema = z.object({
  intent: z.array(z.string()),
  successSignals: z.array(z.string()),
  riskSignals: z.array(z.string())
});

export const conflictSchema = z.object({
  id: z.string(),
  label: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  rationale: z.string()
});

export const conflictAgentDataSchema = z.object({
  conflicts: z.array(conflictSchema),
  assumptions: z.array(z.string())
});

export const optimizationProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tradeOffs: z.array(z.string()),
  aiOnly: z.boolean()
});

export const optimizationAgentDataSchema = z.object({
  proposals: z.array(optimizationProposalSchema)
});

export const futureSimulationDataSchema = z.object({
  outlook: z.string(),
  guardrails: z.array(z.string()),
  followUpQuestions: z.array(z.string())
});

export const judgeScoreSchema = z.object({
  score: z.number(),
  rationale: z.string()
});

export const judgeEvaluationSchema = z.object({
  clarity: judgeScoreSchema,
  consistency: judgeScoreSchema,
  explanationQuality: judgeScoreSchema,
  verdict: z.enum(['approve', 'revise'])
});

export const agentResultSchema = <TSchema extends z.ZodTypeAny>(schema: TSchema) =>
  z.object({
    agent: z.string(),
    generatedAt: z.string(),
    data: schema
  });
