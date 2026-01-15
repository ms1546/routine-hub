'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RoutineAiWorkflowResult } from '../types';

type StreamChunk =
  | { type: 'step'; step: string; data: any }
  | { type: 'progress'; step: string; message: string }
  | { type: 'complete'; data: RoutineAiWorkflowResult }
  | { type: 'error'; error: string };

type StreamState = {
  workflow: RoutineAiWorkflowResult | null;
  partialWorkflow: Partial<RoutineAiWorkflowResult> | null;
  currentStep: string | null;
  progressMessage: string | null;
  isLoading: boolean;
  error: string | null;
};

export function useStreamWorkflow(routineId: string | null) {
  const [state, setState] = useState<StreamState>({
    workflow: null,
    partialWorkflow: null,
    currentStep: null,
    progressMessage: null,
    isLoading: false,
    error: null
  });

  const startStream = useCallback(async () => {
    if (!routineId) return;

    setState({
      workflow: null,
      partialWorkflow: null,
      currentStep: null,
      progressMessage: null,
      isLoading: true,
      error: null
    });

    try {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routineId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start stream');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = line.slice(6);
              const chunk: StreamChunk = JSON.parse(json);

              if (chunk.type === 'progress') {
                setState((prev) => ({
                  ...prev,
                  currentStep: chunk.step,
                  progressMessage: chunk.message
                }));
              } else if (chunk.type === 'step') {
                setState((prev) => {
                  const current = prev.partialWorkflow || {
                    profile: null,
                    interpretation: null,
                    conflicts: null,
                    optimizations: null,
                    futureSimulation: null,
                    evaluation: null,
                    meta: {
                      executionId: '',
                      mastraTraceId: '',
                      proposalsOnly: true,
                      langfuseTraceId: null
                    }
                  } as Partial<RoutineAiWorkflowResult>;

                  const updated = {
                    ...current,
                    [chunk.step]: chunk.data
                  } as Partial<RoutineAiWorkflowResult>;

                  // Check if all required fields are present
                  const isComplete =
                    updated.profile &&
                    updated.interpretation &&
                    updated.conflicts &&
                    updated.optimizations &&
                    updated.futureSimulation &&
                    updated.evaluation;

                  return {
                    ...prev,
                    workflow: isComplete ? (updated as RoutineAiWorkflowResult) : null,
                    partialWorkflow: updated
                  };
                });
              } else if (chunk.type === 'complete') {
                setState({
                  workflow: chunk.data,
                  partialWorkflow: null,
                  currentStep: null,
                  progressMessage: null,
                  isLoading: false,
                  error: null
                });
                return;
              } else if (chunk.type === 'error') {
                setState({
                  workflow: null,
                  partialWorkflow: null,
                  currentStep: null,
                  progressMessage: null,
                  isLoading: false,
                  error: chunk.error
                });
                return;
              }
            } catch (e) {
              console.error('Failed to parse chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      setState({
        workflow: null,
        partialWorkflow: null,
        currentStep: null,
        progressMessage: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [routineId]);

  return {
    ...state,
    startStream
  };
}
