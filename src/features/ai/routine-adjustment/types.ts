/**
 * 文献・個人設定に基づくルーチン再設計の提案型
 */

export type RoutineBlockAdjustment = {
  blockId: string;
  /** 変更後の開始時刻（時間、0-24） */
  startHour?: number;
  /** 変更後の終了時刻（時間、0-24） */
  endHour?: number;
  /** 変更後のブロック名 */
  label?: string;
  /** 変更後の目的 */
  objective?: string;
  /** 変更後のエネルギー（low / medium / high） */
  energyLevel?: 'low' | 'medium' | 'high';
  /** この変更の理由（文献・個人設定のどの点に基づくか） */
  reason: string;
};

export type RoutineAdjustmentProposal = {
  /** 提案全体の理由（なぜこのルーチン調整を提案するか） */
  summaryRationale: string;
  /** ブロックごとの変更案。変更なしのブロックは含めなくてよい */
  blockAdjustments: RoutineBlockAdjustment[];
  /** 週次/日次タイプの変更を提案する場合 */
  suggestedDurationType?: 'normal' | 'weekly';
  /** normal の場合の全体開始時刻 */
  suggestedNormalStartHour?: number;
  /** normal の場合の全体終了時刻 */
  suggestedNormalEndHour?: number;
};
