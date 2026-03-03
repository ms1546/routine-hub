'use server';

import { revalidatePath } from 'next/cache';
import type { Routine, RoutineBlock } from '@/features/routines';
import { routinesRepository } from '@/features/routines';
import { getCurrentUser } from '@/infrastructure/auth/session';
import { getEvidenceAdviceAction } from '@/app/actions/evidence-advice';
import { runRoutineAdjustmentAgent } from '@/features/ai/agents/routine-adjustment-agent';
import type { RoutineAdjustmentProposal, RoutineBlockAdjustment } from '@/features/ai/routine-adjustment/types';
import type { ActionResult } from '@/shared/types/actionResult';
import { userSettingsRepository } from '@/features/users';

export type { RoutineAdjustmentProposal, RoutineBlockAdjustment };

/**
 * 文献・個人設定に基づくルーチン調整案を取得する。
 * 先に evidence-advice を取得し、その要約をコンテキストとして routine-adjustment-agent に渡す。
 */
export async function getRoutineAdjustmentProposalAction(
  routineId: string
): Promise<ActionResult<RoutineAdjustmentProposal>> {
  try {
    const currentUser = await getCurrentUser();
    const routine = await routinesRepository.get(
      routineId,
      currentUser.id,
      currentUser.email,
      currentUser.role === 'admin'
    );
    if (!routine) {
      return { ok: false, error: 'Routineが見つかりません' };
    }

    const settings = await userSettingsRepository.getOrCreate(currentUser.id, {
      displayName: currentUser.displayName,
      timezone: 'Asia/Tokyo',
      requiredSleepHours: 7,
      priorities: ['集中時間を守る', 'カレンダーの権威を尊重'],
      constraints: ['手動確認を好む'],
      energyLevel: 'medium'
    });

    const evidenceResult = await getEvidenceAdviceAction({ routineId });
    const evidenceContextParts: string[] = [];
    evidenceResult.suggestions.forEach((s) => {
      evidenceContextParts.push(`- ${s.description}`);
      s.evidence.forEach((c) => {
        evidenceContextParts.push(`  出典: ${c.title}${c.year ? ` (${c.year})` : ''}`);
      });
    });
    const evidenceContext =
      evidenceContextParts.length > 0
        ? evidenceContextParts.join('\n')
        : evidenceResult.warnings.some((w) => w.includes('一般的な観点'))
          ? '該当する研究文献は見つかりませんでした。一般的な観点として、時間帯・休憩間隔・ブロック長の見直しを考慮してください。'
          : '文献は参照できませんでした。ユーザー設定（希望活動時間・休憩・優先順位）に基づいてルーチン調整を提案してください。';

    const userProfile = {
      timezone: settings.timezone,
      requiredSleepHours: settings.requiredSleepHours,
      preferredWorkStartTime: settings.preferredWorkStartTime,
      preferredWorkEndTime: settings.preferredWorkEndTime,
      minBreakBetweenMinutes: settings.minBreakBetweenMinutes,
      priorities: settings.priorities,
      constraints: settings.constraints,
      energyLevel: settings.energyLevel
    };

    const result = await runRoutineAdjustmentAgent({
      routine,
      userProfile,
      evidenceContext
    });

    return { ok: true, data: result.data };
  } catch (error) {
    console.error('[RoutineAdjustment] getRoutineAdjustmentProposalAction failed:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'ルーチン調整案の取得に失敗しました'
    };
  }
}

/**
 * 提案されたルーチン調整をルーチンに反映する。
 * blockAdjustments を現在の timeBlocks に適用し、durationType / normalStartHour / normalEndHour もあれば更新する。
 */
export async function applyRoutineAdjustmentAction(
  routineId: string,
  proposal: RoutineAdjustmentProposal
): Promise<ActionResult<Routine>> {
  try {
    const currentUser = await getCurrentUser();
    const routine = await routinesRepository.get(
      routineId,
      currentUser.id,
      currentUser.email,
      currentUser.role === 'admin'
    );
    if (!routine) {
      return { ok: false, error: 'Routineが見つかりません' };
    }

    const adjustmentByBlockId = new Map<string, RoutineBlockAdjustment>(
      proposal.blockAdjustments.map((a) => [a.blockId, a])
    );

    const updatedBlocks: RoutineBlock[] = routine.timeBlocks.map((block) => {
      const adj = adjustmentByBlockId.get(block.id);
      if (!adj) return block;
      return {
        ...block,
        startHour: adj.startHour ?? block.startHour,
        endHour: adj.endHour ?? block.endHour,
        label: adj.label ?? block.label,
        objective: adj.objective ?? block.objective,
        energyLevel: adj.energyLevel ?? block.energyLevel
      };
    });

    const patch: Partial<Routine> = {
      timeBlocks: updatedBlocks
    };
    if (proposal.suggestedDurationType !== undefined) patch.durationType = proposal.suggestedDurationType;
    if (proposal.suggestedNormalStartHour !== undefined) patch.normalStartHour = proposal.suggestedNormalStartHour;
    if (proposal.suggestedNormalEndHour !== undefined) patch.normalEndHour = proposal.suggestedNormalEndHour;

    const updated = await routinesRepository.update({
      id: routineId,
      patch
    });

    revalidatePath('/');
    revalidatePath('/routines');
    revalidatePath(`/routines/${routineId}`);

    return { ok: true, data: updated };
  } catch (error) {
    console.error('[RoutineAdjustment] applyRoutineAdjustmentAction failed:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'ルーチンへの反映に失敗しました'
    };
  }
}
