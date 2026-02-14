import type { EvidenceAdviceResult, EvidenceSuggestion } from '../evidence/types';

const DEFAULT_DISCLAIMER =
  '本機能は情報提供のみを目的とした提案です。最終判断はユーザーが行ってください。' +
  '医療・法律・金融の専門助言ではありません。';

export const evidenceDisclaimer = DEFAULT_DISCLAIMER;

export function applyEvidencePolicy({
  query,
  suggestions,
  warnings
}: {
  query: string;
  suggestions: EvidenceSuggestion[];
  warnings: string[];
}): EvidenceAdviceResult {
  return {
    query,
    suggestions,
    warnings,
    disclaimer: DEFAULT_DISCLAIMER
  };
}
