import { NextRequest } from 'next/server';
import { runRoutineAiWorkflow } from '@/features/ai';
import { routinesRepository } from '@/features/routines';
import { getCurrentUser } from '@/infrastructure/auth/session';
import {
  canExecuteWorkflow,
  recordWorkflowFailure,
  recordWorkflowSuccess,
  registerExecutionUsage
} from '@/features/ai/execution-log';
import { runProfileAgent } from '@/features/ai/agents/profile-agent';
import { runRoutineInterpreterAgent } from '@/features/ai/agents/routine-interpreter-agent';
import { runCalendarConflictAgent } from '@/features/ai/agents/calendar-conflict-agent';
import { runOptimizationAgent } from '@/features/ai/agents/optimization-agent';
import { runFutureSimulationAgent } from '@/features/ai/agents/future-simulation-agent';
import { evaluateWorkflow } from '@/features/ai/evaluation/judge';
import type { RoutineAiWorkflowInput } from '@/features/ai/types';

export const dynamic = 'force-dynamic';

type StreamChunk =
  | { type: 'step'; step: string; data: any }
  | { type: 'progress'; step: string; message: string }
  | { type: 'complete'; data: any }
  | { type: 'error'; error: string };

function createStreamResponse(stream: ReadableStream<StreamChunk>) {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function* streamWorkflow(
  input: RoutineAiWorkflowInput,
  routine: any,
  user: any
): AsyncGenerator<StreamChunk> {
  const executionId = crypto.randomUUID();
  try {
    // Step 1: Profile
    yield { type: 'progress', step: 'profile', message: 'プロフィールを分析しています...' };
    const profile = await runProfileAgent({ userProfile: input.user });
    yield { type: 'step', step: 'profile', data: profile };

    // Step 2: Interpretation
    yield { type: 'progress', step: 'interpretation', message: 'ルーチンを解釈しています...' };
    const interpretation = await runRoutineInterpreterAgent({
      routine: input.routine,
      profileSummary: profile.data
    });
    yield { type: 'step', step: 'interpretation', data: interpretation };

    // Step 3: Conflicts
    yield { type: 'progress', step: 'conflicts', message: 'カレンダーとの衝突を確認しています...' };
    const conflicts = await runCalendarConflictAgent({
      routine: input.routine,
      interpretedRoutineIntent: interpretation.data,
      userProfile: input.user,
      calendarWindow: input.calendarWindow
    });
    yield { type: 'step', step: 'conflicts', data: conflicts };

    // Step 4: Optimizations
    yield { type: 'progress', step: 'optimizations', message: '最適化案を生成しています...' };
    const optimizations = await runOptimizationAgent({
      routine: input.routine,
      profile,
      interpretation,
      conflicts
    });
    yield { type: 'step', step: 'optimizations', data: optimizations };

    // Step 5: Future Simulation
    yield { type: 'progress', step: 'futureSimulation', message: '将来のシミュレーションを実行しています...' };
    const futureSimulation = await runFutureSimulationAgent({
      routineName: input.routine.name,
      optimizations,
      profile
    });
    yield { type: 'step', step: 'futureSimulation', data: futureSimulation };

    // Step 6: Evaluation
    yield { type: 'progress', step: 'evaluation', message: '評価を実行しています...' };
    const evaluation = await evaluateWorkflow({
      optimizations,
      conflicts,
      futureSimulation
    });
    yield { type: 'step', step: 'evaluation', data: evaluation };

    // Complete
    const result = {
      profile,
      interpretation,
      conflicts,
      optimizations,
      futureSimulation,
      evaluation,
      meta: {
        executionId,
        mastraTraceId: executionId,
        proposalsOnly: true,
        langfuseTraceId: null
      }
    };

    // Record success
    recordWorkflowSuccess({
      result,
      workflowName: 'routine-ai-workflow',
      routine,
      user
    });

    yield { type: 'complete', data: result };
  } catch (error) {
    // Record failure
    recordWorkflowFailure({
      workflowName: 'routine-ai-workflow',
      routine,
      user,
      error: error instanceof Error ? error : new Error('Unknown workflow failure')
    });

    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function streamToReadableStream(generator: AsyncGenerator<StreamChunk>): ReadableStream<StreamChunk> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { routineId } = body;

    if (!routineId) {
      return new Response(JSON.stringify({ error: 'routineId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const routine = await routinesRepository.get(routineId);
    if (!routine) {
      return new Response(JSON.stringify({ error: 'Routine not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = getCurrentUser();
    if (!canExecuteWorkflow(user)) {
      return new Response(JSON.stringify({ error: 'AI preview limit reached' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const input: RoutineAiWorkflowInput = {
      routine,
      user: {
        timezone: 'Asia/Tokyo',
        priorities: ['集中を守る', '丁寧な合意形成'],
        constraints: ['出張が多い'],
        energyLevel: 'medium'
      },
      calendarWindow: {
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      }
    };

    const generator = streamWorkflow(input, routine, user);
    const stream = streamToReadableStream(generator);

    // Convert to SSE format
    const sseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const reader = stream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const json = JSON.stringify(value);
            controller.enqueue(encoder.encode(`data: ${json}\n\n`));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    registerExecutionUsage(user);

    return createStreamResponse(sseStream);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
