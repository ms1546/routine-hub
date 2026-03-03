/**
 * 文献・個人設定に基づいてルーチン定義そのものを再設計するエージェント。
 * ブロックの短縮・時間帯変更・頻度の提案などを行う。
 */

import { z } from 'zod';
import type { Routine } from '@/features/routines';
import type { UserProfileContext } from '../types';
import { invokeBedrockWithFallback, isBedrockEnabled, ROUTINE_MODEL_ID } from '../providers/bedrock';
import type { AgentResult } from '../types';
import { getSystemPrompt } from '../evaluation/prompt-helper';
import type { RoutineAdjustmentProposal } from '../routine-adjustment/types';

const routineBlockAdjustmentSchema = z.object({
  blockId: z.string().uuid(),
  startHour: z.number().min(0).max(24).optional(),
  endHour: z.number().min(0).max(24).optional(),
  label: z.string().min(1).max(80).optional(),
  objective: z.string().min(1).max(240).optional(),
  energyLevel: z.enum(['low', 'medium', 'high']).optional(),
  reason: z.string().min(1)
});

export const routineAdjustmentProposalSchema = z.object({
  summaryRationale: z.string().min(1),
  blockAdjustments: z.array(routineBlockAdjustmentSchema),
  suggestedDurationType: z.enum(['normal', 'weekly']).optional(),
  suggestedNormalStartHour: z.number().min(0).max(24).optional(),
  suggestedNormalEndHour: z.number().min(0).max(24).optional()
});

export type RoutineAdjustmentAgentInput = {
  routine: Routine;
  userProfile: UserProfileContext;
  /** 文献に基づくアドバイス（evidence-advice の要約テキスト） */
  evidenceContext: string;
};

function buildRoutineSummary(routine: Routine): string {
  const blocks = routine.timeBlocks.map((b) => ({
    id: b.id,
    day: b.day,
    startHour: b.startHour,
    endHour: b.endHour,
    label: b.label,
    objective: b.objective,
    energyLevel: b.energyLevel
  }));
  return JSON.stringify(
    {
      name: routine.name,
      purpose: routine.purpose,
      durationType: routine.durationType,
      normalStartHour: routine.normalStartHour,
      normalEndHour: routine.normalEndHour,
      timeBlocks: blocks
    },
    null,
    2
  );
}

export async function runRoutineAdjustmentAgent({
  routine,
  userProfile,
  evidenceContext
}: RoutineAdjustmentAgentInput): Promise<AgentResult<RoutineAdjustmentProposal>> {
  const fallbackData: RoutineAdjustmentProposal = {
    summaryRationale: '文献・個人設定を参照し、変更が必要な場合は blockAdjustments に具体的な変更案を出してください。',
    blockAdjustments: []
  };

  const systemPrompt = await getSystemPrompt('routine-adjustment-agent');
  const routineSummary = buildRoutineSummary(routine);

  const data = await invokeBedrockWithFallback(
    {
      modelId: ROUTINE_MODEL_ID,
      systemPrompt,
      userPrompt: `
現在のルーチン:
${routineSummary}

ユーザー設定:
- 優先順位: ${userProfile.priorities.join(', ') || '未設定'}
- 制約: ${userProfile.constraints.join(', ') || '未設定'}
- エネルギーレベル: ${userProfile.energyLevel}
- タイムゾーン: ${userProfile.timezone}
${userProfile.requiredSleepHours != null ? `- 必要睡眠時間: ${userProfile.requiredSleepHours}時間` : ''}
${userProfile.preferredWorkStartTime ? `- 希望活動開始: ${userProfile.preferredWorkStartTime}` : ''}
${userProfile.preferredWorkEndTime ? `- 希望活動終了: ${userProfile.preferredWorkEndTime}` : ''}
${userProfile.minBreakBetweenMinutes != null ? `- 連続イベント間最小休憩: ${userProfile.minBreakBetweenMinutes}分` : ''}

【文献・根拠に基づくアドバイス】
${evidenceContext}
      `.trim(),
      schema: routineAdjustmentProposalSchema,
      shapeExample: JSON.stringify({
        summaryRationale: '文献では連続集中は60〜90分が推奨のため、2時間ブロックを90分に短縮することを提案します。',
        blockAdjustments: [
          {
            blockId: '00000000-0000-0000-0000-000000000001',
            endHour: 10.5,
            reason: '集中持続の推奨に合わせて終了を30分前倒し'
          }
        ]
      }),
      temperature: 0.3,
      maxTokens: 800
    },
    () => fallbackData
  );

  return {
    agent: isBedrockEnabled() ? 'bedrock/routine-adjustment-agent' : 'heuristic/routine-adjustment-agent',
    generatedAt: new Date().toISOString(),
    data
  };
}
