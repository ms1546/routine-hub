import { NextRequest } from 'next/server';
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
import { recordLangfuseTrace, recordLangfuseScore } from '@/features/ai/evaluation/langfuse-boundary';
import { getSystemPromptInfo, type AgentPromptName } from '@/features/ai/evaluation/prompt-helper';
import type { RoutineAiWorkflowInput } from '@/features/ai/types';

const STREAM_WORKFLOW_AGENTS: AgentPromptName[] = [
  'profile-agent',
  'routine-interpreter-agent',
  'calendar-conflict-agent',
  'optimization-agent',
  'future-simulation-agent',
  'judge-agent'
];

export const dynamic = 'force-dynamic';

type StreamChunk =
  | { type: 'step'; step: string; data: any }
  | { type: 'progress'; step: string; message: string }
  | { type: 'text'; text: string }
  | { type: 'complete'; data: any }
  | { type: 'error'; error: string };

// 各ステップの結果をテキスト形式に変換
function formatStepAsText(step: string, data: any): string {
  switch (step) {
    case 'profile':
      return `## プロフィール分析\n\nペルソナ: ${data.data.persona}\n\n重要な制約:\n${data.data.highlightedConstraints.map((c: string) => `- ${c}`).join('\n')}\n\n推奨トーン: ${data.data.toneGuidance}\n\n`;
    case 'interpretation':
      return `## ルーチン解釈\n\n意図: ${data.data.intent}\n\n成功要因:\n${data.data.successSignals.map((s: string) => `- ${s}`).join('\n')}\n\n${data.data.riskSignals.length > 0 ? `リスク要因:\n${data.data.riskSignals.map((r: string) => `- ${r}`).join('\n')}\n\n` : ''}`;
    case 'conflicts':
      return `## 衝突確認\n\n${data.data.conflicts.length > 0 ? `検出された衝突:\n${data.data.conflicts.map((c: any) => `- **${c.label}** (${c.severity}): ${c.rationale}`).join('\n')}\n\n` : '衝突は検出されませんでした。\n\n'}前提条件:\n${data.data.assumptions.map((a: string) => `- ${a}`).join('\n')}\n\n`;
    case 'optimizations':
      return `## 最適化提案\n\n${data.data.proposals.map((p: any) => `### ${p.title}\n${p.description}\n\nトレードオフ: ${p.tradeOffs.join(', ')}\n${p.aiOnly ? '(AIのみで実行可能)' : '(人間の確認が必要)'}\n`).join('\n')}`;
    case 'futureSimulation':
      return `## 将来シミュレーション\n\n見通し: ${data.data.outlook}\n\nガードレール:\n${data.data.guardrails.map((g: string) => `- ${g}`).join('\n')}\n\nフォローアップ質問:\n${data.data.followUpQuestions.map((q: string) => `- ${q}`).join('\n')}\n\n`;
    case 'evaluation':
      return `## 評価結果\n\n判定: ${data.data.verdict === 'approve' ? '承認' : '要修正'}\n\nスコア:\n- 明確性: ${data.data.clarity.score}/10 (${data.data.clarity.rationale})\n- 一貫性: ${data.data.consistency.score}/10 (${data.data.consistency.rationale})\n- 説明品質: ${data.data.explanationQuality.score}/10 (${data.data.explanationQuality.rationale})\n\n`;
    default:
      return '';
  }
}

// テキストを文字列として送信（クライアント側で順番に表示）
function* streamText(text: string): Generator<StreamChunk> {
  yield { type: 'text', text };
}

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

  // Langfuse: プロンプトバージョン取得 & Trace作成
  const promptVersions: Record<string, { version?: number; labels?: string[]; source: string }> = {};
  await Promise.all(
    STREAM_WORKFLOW_AGENTS.map(async (agentName) => {
      try {
        const promptInfo = await getSystemPromptInfo(agentName);
        promptVersions[agentName] = {
          version: promptInfo.version,
          labels: promptInfo.labels,
          source: promptInfo.source
        };
      } catch {
        // プロンプト取得に失敗してもワークフロー実行は継続
      }
    })
  );

  const langfuse = await recordLangfuseTrace({
    workflow: 'routine-planning-workflow-stream',
    payload: {
      executionId,
      routineId: routine.id,
      promptVersions
    },
    traceId: executionId
  });

  try {
    // Step 1: Profile
    yield { type: 'progress', step: 'profile', message: 'プロフィールを分析しています...' };
    const profile = await runProfileAgent({ userProfile: input.user });
    const profileText = formatStepAsText('profile', profile);
    for await (const chunk of streamText(profileText)) {
      yield chunk;
    }
    yield { type: 'step', step: 'profile', data: profile };

    // Step 2: Interpretation
    yield { type: 'progress', step: 'interpretation', message: 'ルーチンを解釈しています...' };
    const interpretation = await runRoutineInterpreterAgent({
      routine: input.routine,
      profileSummary: profile.data
    });
    const interpretationText = formatStepAsText('interpretation', interpretation);
    for await (const chunk of streamText(interpretationText)) {
      yield chunk;
    }
    yield { type: 'step', step: 'interpretation', data: interpretation };

    // Step 3: Conflicts
    yield { type: 'progress', step: 'conflicts', message: 'カレンダーとの衝突を確認しています...' };
    const conflicts = await runCalendarConflictAgent({
      routine: input.routine,
      interpretedRoutineIntent: interpretation.data,
      userProfile: input.user,
      calendarWindow: input.calendarWindow
    });
    const conflictsText = formatStepAsText('conflicts', conflicts);
    for await (const chunk of streamText(conflictsText)) {
      yield chunk;
    }
    yield { type: 'step', step: 'conflicts', data: conflicts };

    // Step 4: Optimizations
    yield { type: 'progress', step: 'optimizations', message: '最適化案を生成しています...' };
    const optimizations = await runOptimizationAgent({
      routine: input.routine,
      profile,
      interpretation,
      conflicts
    });
    const optimizationsText = formatStepAsText('optimizations', optimizations);
    for await (const chunk of streamText(optimizationsText)) {
      yield chunk;
    }
    yield { type: 'step', step: 'optimizations', data: optimizations };

    // Step 5: Future Simulation
    yield { type: 'progress', step: 'futureSimulation', message: '将来のシミュレーションを実行しています...' };
    const futureSimulation = await runFutureSimulationAgent({
      routineName: input.routine.name,
      optimizations,
      profile
    });
    const futureSimulationText = formatStepAsText('futureSimulation', futureSimulation);
    for await (const chunk of streamText(futureSimulationText)) {
      yield chunk;
    }
    yield { type: 'step', step: 'futureSimulation', data: futureSimulation };

    // Step 6: Evaluation
    yield { type: 'progress', step: 'evaluation', message: '評価を実行しています...' };
    const evaluation = await evaluateWorkflow({
      optimizations,
      conflicts,
      futureSimulation
    });
    const evaluationText = formatStepAsText('evaluation', evaluation);
    for await (const chunk of streamText(evaluationText)) {
      yield chunk;
    }
    yield { type: 'step', step: 'evaluation', data: evaluation };

    // Langfuse: LLM as Judge のスコアを記録
    const evalData = evaluation.data;
    const averageScore =
      (evalData.clarity.score + evalData.consistency.score + evalData.explanationQuality.score) / 3;
    await recordLangfuseScore({
      traceId: langfuse.traceId,
      name: 'judge-overall',
      value: averageScore,
      comment: `Verdict: ${evalData.verdict}`,
      source: 'MODEL',
      metadata: {
        clarity: evalData.clarity.score,
        consistency: evalData.consistency.score,
        explanationQuality: evalData.explanationQuality.score,
        verdict: evalData.verdict
      }
    });

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
        proposalsOnly: true as const,
        langfuseTraceId: langfuse.traceId
      }
    };

    // Record success
    await recordWorkflowSuccess({
      result,
      workflowName: 'routine-ai-workflow',
      routine,
      user
    });

    yield { type: 'complete', data: result };
  } catch (error) {
    // Record failure
    await recordWorkflowFailure({
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

    const user = await getCurrentUser();
    const routine = await routinesRepository.get(
      routineId,
      user.id,
      user.email,
      user.role === 'admin'
    );
    if (!routine) {
      return new Response(JSON.stringify({ error: 'Routine not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!(await canExecuteWorkflow(user))) {
      return new Response(JSON.stringify({ error: 'AI preview limit reached' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ユーザー設定を取得（なければデフォルト値で作成）
    const { userSettingsRepository } = await import('@/features/users');
    const settings = await userSettingsRepository.getOrCreate(user.id, {
      displayName: user.displayName,
      timezone: 'Asia/Tokyo',
      requiredSleepHours: 7,
      priorities: ['集中時間を守る', 'カレンダーの権威を尊重'],
      constraints: ['手動確認を好む'],
      energyLevel: 'medium'
    });

    const input: RoutineAiWorkflowInput = {
      routine,
      user: {
        timezone: settings.timezone,
        priorities: settings.priorities,
        constraints: settings.constraints,
        energyLevel: settings.energyLevel
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

    await registerExecutionUsage(user);

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
