import type { Routine } from '@/features/routines';

/**
 * routine-schema-tool
 *
 * Routine モデルから、LLM が扱いやすい構造化情報だけを抽出する。
 * （将来的に別ストアから取得する場合も、このインターフェースを保てばよい）
 */
export type RoutineSchemaSummary = {
  id: string;
  name: string;
  purpose: string;
  durationType: Routine['durationType'];
  visibility: Routine['visibility'];
  tags: string[];
  normalStartHour?: number | null;
  normalEndHour?: number | null;
  timeBlocks: Array<{
    id: string;
    label: string;
    objective?: string | null;
    day: string;
    startHour: number;
    endHour: number;
    energyLevel?: string | null;
  }>;
};

export function routineSchemaTool(routine: Routine): RoutineSchemaSummary {
  return {
    id: routine.id,
    name: routine.name,
    purpose: routine.purpose ?? '',
    durationType: routine.durationType,
    visibility: routine.visibility,
    tags: routine.tags ?? [],
    normalStartHour: routine.normalStartHour ?? null,
    normalEndHour: routine.normalEndHour ?? null,
    timeBlocks: (routine.timeBlocks ?? []).map((block) => ({
      id: block.id,
      label: block.label ?? '',
      objective: block.objective ?? null,
      day: block.day,
      startHour: block.startHour,
      endHour: block.endHour,
      energyLevel: block.energyLevel ?? null
    }))
  };
}

