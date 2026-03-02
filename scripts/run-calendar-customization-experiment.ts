/**
 * Calendar Customization ワークフローの実験実行スクリプト（run-routine-experiment と同じパターン）
 *
 * 使い方:
 *   LANGFUSE_PUBLIC_KEY=xxx LANGFUSE_SECRET_KEY=xxx npx tsx scripts/run-calendar-customization-experiment.ts
 *
 * 前提: AWS_BEDROCK_* または BEDROCK 関連の環境変数（Bedrock 有効時）
 *       Mastra の calendarCustomizationWorkflow が登録済み
 */

import { randomUUID } from 'node:crypto';
import { runCalendarCustomizationWithTrace } from '../src/app/actions/calendar-customization-core';
import type { CalendarCustomizationRunInput } from '../src/app/actions/calendar-customization-core';

type ExperimentItem = {
  input: CalendarCustomizationRunInput;
};

/** サンプルテストケース（docs/calendar-customization-prompt-improvement.md ケース1 相当） */
const SAMPLE_DATA: ExperimentItem[] = [
  {
    input: {
      proposedEvents: [
        {
          proposalId: 'test-routine-id-test-block-id-2026-03-02',
          routineId: 'test-routine-id',
          blockId: 'test-block-id',
          title: 'フルデイ・ワークデイ · 午後ブロック',
          description: '集中作業',
          start: '2026-03-02T05:00:00.000Z',
          end: '2026-03-02T07:00:00.000Z',
          status: 'pending' as const
        }
      ],
      existingEvents: [
        {
          id: 'existing-1',
          title: '週次定例',
          start: '2026-03-02T05:00:00.000Z',
          end: '2026-03-02T06:00:00.000Z'
        }
      ],
      userProfile: {
        timezone: 'Asia/Tokyo',
        priorities: ['集中時間を守る', 'カレンダーの権威を尊重'],
        constraints: ['手動確認を好む'],
        energyLevel: 'medium' as const
      },
      routinePurpose: '平日の習慣を朝昼で区切って管理',
      evidenceContext: ''
    }
  }
];

async function runExperiment() {
  console.log('[Experiment] Starting calendar customization workflow experiment...');
  console.log(`[Experiment] Items: ${SAMPLE_DATA.length}\n`);

  const results: Array<{
    index: number;
    traceId: string;
    customizedCount: number;
    suggestionsCount: number;
    conflictAdjusted: number;
    ok: boolean;
  }> = [];

  for (let i = 0; i < SAMPLE_DATA.length; i++) {
    const item = SAMPLE_DATA[i]!;
    const traceId = randomUUID();
    try {
      const result = await runCalendarCustomizationWithTrace(item.input, traceId);
      const conflictAdjusted = result.customizedEvents.filter(
        (c) => c.start != null || c.end != null
      ).length;

      results.push({
        index: i + 1,
        traceId,
        customizedCount: result.customizedEvents.length,
        suggestionsCount: result.suggestions.length,
        conflictAdjusted,
        ok: true
      });

      console.log(
        `  [${i + 1}/${SAMPLE_DATA.length}] traceId=${traceId} | ` +
          `customized=${result.customizedEvents.length} suggestions=${result.suggestions.length} ` +
          `adjusted=${conflictAdjusted} | OK`
      );
    } catch (error) {
      console.error(`  [${i + 1}/${SAMPLE_DATA.length}] ERROR:`, error);
      results.push({
        index: i + 1,
        traceId,
        customizedCount: 0,
        suggestionsCount: 0,
        conflictAdjusted: 0,
        ok: false
      });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log('\n--- Summary ---');
  console.log(`OK: ${okCount}/${results.length}`);
  console.log('\nLangfuse Trace IDs (for manual evaluation):');
  results.forEach((r) => {
    if (r.ok) console.log(`  [${r.index}] ${r.traceId}`);
  });
}

runExperiment().catch((err) => {
  console.error('[Experiment] Fatal error:', err);
  process.exit(1);
});
