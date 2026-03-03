/**
 * Routine Planning ワークフローの実験実行スクリプト
 *
 * 使い方:
 *   LANGFUSE_PUBLIC_KEY=xxx LANGFUSE_SECRET_KEY=xxx npx tsx scripts/run-routine-experiment.ts
 *
 * 前提: AWS_BEDROCK_* または BEDROCK 関連の環境変数（Bedrock 有効時）
 *       DynamoDB 等のインフラは実験には不要（Mastra runner は DB に依存しない）
 */

import { randomUUID } from 'node:crypto';
import {
  runRoutineAiWorkflow,
  setRoutineAiWorkflowRunner,
  getRoutineAiWorkflowRunner
} from '../src/features/ai/index';
import { MastraRoutineAiWorkflowRunner } from '../src/features/ai/workflows/routine-mastra-runner';
import type { RoutineAiWorkflowInput } from '../src/features/ai/types';
import type { Routine } from '../src/features/routines';

type ExperimentItem = {
  input: RoutineAiWorkflowInput;
  expected_output?: {
    verdict?: 'approve' | 'revise';
    minClarityScore?: number;
    minConsistencyScore?: number;
  };
};

/** サンプルテストケース（ローカルデータ） */
// const SAMPLE_DATA: ExperimentItem[] = [
//   {
//     input: {
//       routine: {
//         id: randomUUID(),
//         name: '朝のルーティン',
//         description: '起床から出勤まで',
//         purpose: '生産性向上',
//         durationType: 'weekly',
//         visibility: 'private',
//         tags: [],
//         owner: 'test@example.com',
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         version: 1,
//         timeBlocks: [
//           {
//             id: randomUUID(),
//             day: 'monday',
//             startHour: 7,
//             endHour: 9,
//             label: '朝の準備',
//             objective: '身支度と朝食',
//             energyLevel: 'medium'
//           }
//         ],
//         stats: { clones: 0, applications: 0, likes: 0 }
//       } as Routine,
//       user: {
//         timezone: 'Asia/Tokyo',
//         priorities: ['集中時間を守る'],
//         constraints: ['手動確認を好む'],
//         energyLevel: 'high'
//       },
//       calendarWindow: {
//         startDate: '2025-02-01',
//         endDate: '2025-02-07'
//       }
//     },
//     expected_output: {
//       verdict: 'approve',
//       minClarityScore: 3,
//       minConsistencyScore: 3
//     }
//   }
// ];

async function runExperiment() {
  const originalRunner = getRoutineAiWorkflowRunner();
  setRoutineAiWorkflowRunner(new MastraRoutineAiWorkflowRunner());

  try {
    console.log('[Experiment] Starting routine planning workflow experiment...');
    console.log(`[Experiment] Items: ${SAMPLE_DATA.length}\n`);

    const results: Array<{
      index: number;
      verdict: string;
      clarity: number;
      consistency: number;
      explanationQuality: number;
      averageScore: number;
      passed: boolean;
      langfuseTraceId: string | null;
    }> = [];

    for (let i = 0; i < SAMPLE_DATA.length; i++) {
      const item = SAMPLE_DATA[i]!;
      try {
        const result = await runRoutineAiWorkflow({
          routine: item.input.routine,
          user: item.input.user,
          calendarWindow: item.input.calendarWindow
        });

        const evalData = result.evaluation.data;
        const averageScore =
          (evalData.clarity.score + evalData.consistency.score + evalData.explanationQuality.score) / 3;

        const expected = item.expected_output;
        const passed = expected
          ? evalData.verdict === expected.verdict &&
            evalData.clarity.score >= (expected.minClarityScore ?? 0) &&
            evalData.consistency.score >= (expected.minConsistencyScore ?? 0)
          : true;

        results.push({
          index: i + 1,
          verdict: evalData.verdict,
          clarity: evalData.clarity.score,
          consistency: evalData.consistency.score,
          explanationQuality: evalData.explanationQuality.score,
          averageScore,
          passed,
          langfuseTraceId: result.meta.langfuseTraceId
        });

        console.log(
          `  [${i + 1}/${SAMPLE_DATA.length}] ${evalData.verdict} | ` +
            `clarity=${evalData.clarity.score} consistency=${evalData.consistency.score} ` +
            `explanation=${evalData.explanationQuality.score} | avg=${averageScore.toFixed(2)} | ` +
            `${passed ? 'PASS' : 'FAIL'}`
        );
      } catch (error) {
        console.error(`  [${i + 1}/${SAMPLE_DATA.length}] ERROR:`, error);
        results.push({
          index: i + 1,
          verdict: 'error',
          clarity: 0,
          consistency: 0,
          explanationQuality: 0,
          averageScore: 0,
          passed: false,
          langfuseTraceId: null
        });
      }
    }

    const passedCount = results.filter((r) => r.passed).length;
    const avgScore =
      results.reduce((sum, r) => sum + r.averageScore, 0) / results.filter((r) => r.verdict !== 'error').length || 0;

    console.log('\n--- Summary ---');
    console.log(`Passed: ${passedCount}/${results.length}`);
    console.log(`Average score: ${avgScore.toFixed(2)}`);
    console.log('\nLangfuse Trace IDs (for manual evaluation):');
    results.forEach((r) => {
      if (r.langfuseTraceId) console.log(`  [${r.index}] ${r.langfuseTraceId}`);
    });
  } finally {
    setRoutineAiWorkflowRunner(originalRunner);
  }
}

runExperiment().catch((err) => {
  console.error('[Experiment] Fatal error:', err);
  process.exit(1);
});
