import type {
  AgentResult,
  JudgeEvaluation,
  OptimizationAgentData,
  FutureSimulationData,
  ConflictAgentData
} from '../types';
import type { UserProfileContext } from '../types';
import { judgeEvaluationSchema, calendarCustomizationJudgeSchema } from '../schemas';
import type { z } from 'zod';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import { getSystemPrompt } from './prompt-helper';

/** ルールベースのフォールバック（Bedrock無効時・LLM失敗時） */
function evaluateWorkflowRuleBased(input: {
  optimizations: AgentResult<OptimizationAgentData>;
  conflicts: AgentResult<ConflictAgentData>;
  futureSimulation: AgentResult<FutureSimulationData>;
}): JudgeEvaluation {
  const scoreDimension = (weight: number, count: number) => {
    const score = Math.min(5, Math.max(1, Math.round(weight + count)));
    return score;
  };
  const clarityScore = scoreDimension(2, input.conflicts.data.conflicts.length / 2 + 1);
  const consistencyScore = scoreDimension(2, input.optimizations.data.proposals.length / 3);
  const explanationScore = scoreDimension(2, input.futureSimulation.data.guardrails.length / 2);
  const verdict = clarityScore >= 3 && consistencyScore >= 3 ? 'approve' : 'revise';

  return {
    clarity: { score: clarityScore, rationale: '制約の網羅状況を基準に採点。' },
    consistency: { score: consistencyScore, rationale: '提案と意図の整合度合いからスコア算出。' },
    explanationQuality: { score: explanationScore, rationale: '提示されたオプティマイズ案の多様性で評価。' },
    verdict
  };
}

function buildJudgeUserPrompt(input: {
  optimizations: AgentResult<OptimizationAgentData>;
  conflicts: AgentResult<ConflictAgentData>;
  futureSimulation: AgentResult<FutureSimulationData>;
}): string {
  const conflictsText =
    input.conflicts.data.conflicts.length > 0
      ? input.conflicts.data.conflicts
          .map((c) => `- ${c.label} (${c.severity}): ${c.rationale}`)
          .join('\n')
      : 'なし';
  const assumptionsText =
    input.conflicts.data.assumptions.length > 0
      ? input.conflicts.data.assumptions.map((a) => `- ${a}`).join('\n')
      : 'なし';

  const proposalsText =
    input.optimizations.data.proposals.length > 0
      ? input.optimizations.data.proposals
          .map(
            (p) =>
              `- ${p.title}: ${p.description} [トレードオフ: ${p.tradeOffs.join(', ')}]`
          )
          .join('\n')
      : 'なし';

  const outlook = input.futureSimulation.data.outlook;
  const guardrailsText =
    input.futureSimulation.data.guardrails.length > 0
      ? input.futureSimulation.data.guardrails.map((g) => `- ${g}`).join('\n')
      : 'なし';
  const followUpsText =
    input.futureSimulation.data.followUpQuestions.length > 0
      ? input.futureSimulation.data.followUpQuestions.map((q) => `- ${q}`).join('\n')
      : 'なし';

  return `## 衝突検出
${conflictsText}

前提・仮定:
${assumptionsText}

## 最適化提案
${proposalsText}

## 将来シミュレーション
見通し: ${outlook}

ガードレール:
${guardrailsText}

フォローアップ質問:
${followUpsText}

---
上記のワークフロー出力を評価し、clarity / consistency / explanationQuality の3観点でスコア(1-5)と理由を付けてください。verdict は approve または revise で返してください。`;
}

const fallbackShapeExample = JSON.stringify({
  clarity: { score: 4, rationale: '制約と衝突が明確に整理されている。' },
  consistency: { score: 3, rationale: '提案は意図と概ね整合している。' },
  explanationQuality: { score: 4, rationale: 'トレードオフが適切に説明されている。' },
  verdict: 'approve'
});

export async function evaluateWorkflow(
  input: {
    optimizations: AgentResult<OptimizationAgentData>;
    conflicts: AgentResult<ConflictAgentData>;
    futureSimulation: AgentResult<FutureSimulationData>;
  }
): Promise<AgentResult<JudgeEvaluation>> {
  const fallbackData = evaluateWorkflowRuleBased(input);

  const data = await invokeBedrockWithFallback(
    {
      systemPrompt: await getSystemPrompt('judge-agent'),
      userPrompt: buildJudgeUserPrompt(input),
      schema: judgeEvaluationSchema,
      shapeExample: fallbackShapeExample,
      temperature: 0.2,
      maxTokens: 800
    },
    () => fallbackData
  );

  // スコアを1-5にクランプ（LLMが範囲外を返す場合の保険）
  const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
  const clampedData: JudgeEvaluation = {
    clarity: { score: clamp(data.clarity.score), rationale: data.clarity.rationale },
    consistency: { score: clamp(data.consistency.score), rationale: data.consistency.rationale },
    explanationQuality: {
      score: clamp(data.explanationQuality.score),
      rationale: data.explanationQuality.rationale
    },
    verdict: data.verdict
  };

  return {
    agent: isBedrockEnabled() ? 'bedrock/llm-judge' : 'heuristic/llm-judge',
    generatedAt: new Date().toISOString(),
    data: clampedData
  };
}

/** Calendar customization Judge の入力（プロンプト用に要約可能な形） */
export type CalendarCustomizationJudgeInput = {
  userProfile: UserProfileContext;
  routinePurpose: string | undefined;
  evidenceContext: string | undefined;
  existingEventsSummary: string;
  customizedEvents: Array<{
    proposalId: string;
    title?: string;
    description?: string;
    start?: string;
    end?: string;
    reasoning: string;
  }>;
  suggestions: Array<{
    type: string;
    description: string;
    affectedProposalIds: string[];
  }>;
};

export type CalendarCustomizationJudgeResult = z.infer<typeof calendarCustomizationJudgeSchema>;

function buildCalendarCustomizationJudgeUserPrompt(input: CalendarCustomizationJudgeInput): string {
  const profileLines = [
    `timezone: ${input.userProfile.timezone}`,
    `requiredSleepHours: ${input.userProfile.requiredSleepHours}`,
    `preferredWorkStart: ${input.userProfile.preferredWorkStartTime ?? '未設定'}`,
    `preferredWorkEnd: ${input.userProfile.preferredWorkEndTime ?? '未設定'}`,
    `minBreakBetweenMinutes: ${input.userProfile.minBreakBetweenMinutes ?? '未設定'}`,
    `priorities: ${(input.userProfile.priorities ?? []).join(', ') || 'なし'}`,
    `constraints: ${(input.userProfile.constraints ?? []).join(', ') || 'なし'}`,
    `energyLevel: ${input.userProfile.energyLevel ?? '未設定'}`
  ].join('\n');

  const customizedText =
    input.customizedEvents.length > 0
      ? input.customizedEvents
          .map(
            (e) =>
              `- ${e.proposalId}: ${e.title ?? ''} start=${e.start ?? '変更なし'} end=${e.end ?? '変更なし'} reasoning=${e.reasoning.slice(0, 120)}`
          )
          .join('\n')
      : 'なし';
  const suggestionsText =
    input.suggestions.length > 0
      ? input.suggestions.map((s) => `- [${s.type}] ${s.description} (${s.affectedProposalIds.join(', ')})`).join('\n')
      : 'なし';

  return `## ユーザー設定
${profileLines}

## ルーチン目的
${input.routinePurpose ?? '未指定'}

## 文献・根拠（入力にある場合）
${input.evidenceContext?.slice(0, 800) ?? 'なし'}

## 既存予定の概要
${input.existingEventsSummary}

## カスタマイズ結果（customizedEvents）
${customizedText}

## 提案（suggestions）
${suggestionsText}

---
上記の入力と出力を評価し、purposePreserving / evidenceApplied / userSettingsRespected を1〜5（文献が無い場合は evidenceApplied は0可）で付けてください。`;
}

const calendarJudgeShapeExample = JSON.stringify({
  purposePreserving: 4,
  purposePreservingRationale: '時間変更がルーチン目的に沿っている。',
  evidenceApplied: 3,
  evidenceAppliedRationale: '文献の推奨が一部反映されている。',
  userSettingsRespected: 5,
  userSettingsRespectedRationale: '希望時間・休憩が守られている。'
});

/** ルールベースのフォールバック（Bedrock 無効時・失敗時） */
function evaluateCalendarCustomizationRuleBased(input: CalendarCustomizationJudgeInput): CalendarCustomizationJudgeResult {
  const hasEvidence = Boolean(input.evidenceContext?.trim());
  return {
    purposePreserving: 3,
    evidenceApplied: hasEvidence ? 3 : 0,
    userSettingsRespected: 3
  };
}

export async function evaluateCalendarCustomization(
  input: CalendarCustomizationJudgeInput
): Promise<CalendarCustomizationJudgeResult> {
  const fallbackData = evaluateCalendarCustomizationRuleBased(input);

  const data = await invokeBedrockWithFallback(
    {
      systemPrompt: await getSystemPrompt('calendar-customization-judge-agent'),
      userPrompt: buildCalendarCustomizationJudgeUserPrompt(input),
      schema: calendarCustomizationJudgeSchema,
      shapeExample: calendarJudgeShapeExample,
      temperature: 0.2,
      maxTokens: 600
    },
    () => fallbackData
  );

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));
  return {
    purposePreserving: clamp(data.purposePreserving, 1, 5),
    purposePreservingRationale: data.purposePreservingRationale,
    evidenceApplied: clamp(data.evidenceApplied, 0, 5),
    evidenceAppliedRationale: data.evidenceAppliedRationale,
    userSettingsRespected: clamp(data.userSettingsRespected, 1, 5),
    userSettingsRespectedRationale: data.userSettingsRespectedRationale
  };
}
