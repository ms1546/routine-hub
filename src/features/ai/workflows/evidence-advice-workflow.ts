import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import type { Routine } from '@/features/routines';
import type { UserProfileContext } from '../types';
import { runEvidenceAdviceAgent } from '../agents/evidence-advice-agent';

const evidenceCitationSchema = z.object({
  sourceId: z.string(),
  title: z.string(),
  year: z.number().optional(),
  venue: z.string().optional(),
  authors: z.array(z.string()).optional(),
  url: z.string().optional(),
  citedByCount: z.number().optional()
});

const evidenceSuggestionSchema = z.object({
  id: z.string(),
  description: z.string(),
  evidence: z.array(evidenceCitationSchema),
  confidence: z.enum(['low', 'medium', 'high'])
});

const workflowInputSchema = z.object({
  routine: z.custom<Routine>(),
  userProfile: z.custom<UserProfileContext>(),
  minEvidenceCount: z.number().min(1).optional()
});

const workflowOutputSchema = z.object({
  query: z.string(),
  searchQuery: z.string().optional(),
  suggestions: z.array(evidenceSuggestionSchema),
  warnings: z.array(z.string()),
  disclaimer: z.string()
});

const evidenceAdviceStep = createStep({
  id: 'evidence-advice-step',
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => {
    return runEvidenceAdviceAgent({
      routine: inputData.routine,
      userProfile: inputData.userProfile,
      minEvidenceCount: inputData.minEvidenceCount
    });
  }
});

export const evidenceAdviceWorkflow = createWorkflow({
  id: 'evidence-advice-workflow',
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema
})
  .then(evidenceAdviceStep)
  .commit();

export const evidenceAdviceWorkflowSchemas = {
  input: workflowInputSchema,
  output: workflowOutputSchema
};
