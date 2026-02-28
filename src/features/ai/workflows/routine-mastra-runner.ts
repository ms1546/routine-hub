import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';
import type {
  RoutineAiWorkflowInput,
  RoutineAiWorkflowOptions,
  RoutineAiWorkflowResult,
  RoutineAiWorkflowRunner
} from '../types';
import {
  recordLangfuseTrace,
  recordLangfuseScore,
  updateLangfuseTraceOutput
} from '../evaluation/langfuse-boundary';
import { getSystemPromptInfo, type AgentPromptName } from '../evaluation/prompt-helper';
import { mastraRepository } from '../mastra/repository';

/**
 * ワークフローで使用される主要なエージェントのリスト
 */
const WORKFLOW_AGENTS: AgentPromptName[] = [
  'profile-agent',
  'routine-interpreter-agent',
  'calendar-conflict-agent',
  'optimization-agent',
  'future-simulation-agent',
  'calendar-customization-agent',
  'judge-agent'
];

const generateUUID = createDefaultUUIDGenerator();

export class MastraRoutineAiWorkflowRunner implements RoutineAiWorkflowRunner {
  async run(input: RoutineAiWorkflowInput, options?: RoutineAiWorkflowOptions): Promise<RoutineAiWorkflowResult> {
    const traceId = options?.traceId ?? generateUUID();

    // 0. プロンプトバージョン情報を事前に取得（メタデータ記録用）
    const promptVersions: Record<string, { version?: number; labels?: string[]; source: string }> = {};
    await Promise.all(
      WORKFLOW_AGENTS.map(async (agentName) => {
        try {
          const promptInfo = await getSystemPromptInfo(agentName);
          promptVersions[agentName] = {
            version: promptInfo.version,
            labels: promptInfo.labels,
            source: promptInfo.source
          };
        } catch (error) {
          // プロンプト取得に失敗してもワークフロー実行は継続
          console.warn(`[RoutuneHub] Failed to get prompt info for ${agentName}:`, error);
        }
      })
    );

    // 1. Langfuse Traceを先に作成（プロンプトバージョン情報を含める）
    const langfuse = await recordLangfuseTrace({
      workflow: 'routine-planning-workflow',
      payload: {
        executionId: traceId,
        routineId: input.routine.id,
        promptVersions // プロンプトバージョン情報を追加
      },
      traceId
    });

    // 2. Mastraワークフロー実行
    const workflow = mastraRepository.getWorkflows().routinePlanningWorkflow;
    if (!workflow) {
      throw new Error('Routine workflow is not registered in Mastra repository');
    }

    const run = await workflow.createRunAsync();
    const runResult = await run.start({
      inputData: input,
      tracingOptions: { traceId }
    });

    if (runResult.status !== 'success' || !runResult.result) {
      throw new Error('Mastra workflow execution failed');
    }

    // 3. Trace の output を記録
    const result = runResult.result;
    await updateLangfuseTraceOutput({
      traceId: langfuse.traceId,
      output: {
        verdict: result.evaluation?.data.verdict,
        evaluation: result.evaluation?.data,
        conflictCount: result.conflicts?.data.conflicts?.length ?? 0,
        optimizationCount: result.optimizations?.data.proposals?.length ?? 0
      }
    });

    // 4. LLM as Judgeの評価結果をLangfuseに記録
    if (result.evaluation) {
      const evalData = result.evaluation.data;
      const averageScore = (
        evalData.clarity.score +
        evalData.consistency.score +
        evalData.explanationQuality.score
      ) / 3;

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
    }

    return {
      ...result,
      meta: {
        executionId: traceId,
        mastraTraceId: traceId,
        proposalsOnly: true,
        langfuseTraceId: langfuse.traceId
      }
    };
  }
}
