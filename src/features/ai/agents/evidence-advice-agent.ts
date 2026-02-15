import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';
import type { Routine } from '@/features/routines';
import { z } from 'zod';
import type { UserProfileContext } from '../types';
import type { EvidenceAdviceResult, EvidenceCitation, EvidenceSuggestion } from '../evidence/types';
import { literatureSearchTool } from '../tools/literature-search-tool';
import { applyEvidencePolicy } from '../tools/evidence-policy-tool';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';

const generateUUID = createDefaultUUIDGenerator();

export type EvidenceAdviceAgentInput = {
  routine: Routine;
  userProfile: UserProfileContext;
  minEvidenceCount?: number;
};

const buildEvidenceQuery = (routine: Routine, userProfile: UserProfileContext): string => {
  const parts = [
    routine.purpose,
    routine.description,
    routine.tags?.join(' '),
    userProfile.priorities.join(' '),
    userProfile.constraints.join(' ')
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));

  return parts.join(' ').slice(0, 400);
};

const NON_ASCII_REGEX = /[^\x00-\x7F]/;

const translationSchema = z.object({
  translation: z.string()
});

const translateQueryToEnglish = async (
  query: string
): Promise<{ searchQuery: string; displayQuery: string; translationFailed: boolean }> => {
  if (!NON_ASCII_REGEX.test(query)) {
    return { searchQuery: query, displayQuery: query, translationFailed: false };
  }

  if (!isBedrockEnabled()) {
    return { searchQuery: query, displayQuery: query, translationFailed: true };
  }

  const result = await invokeBedrockWithFallback(
    {
      systemPrompt:
        'You translate short search queries into concise English keywords for academic literature search.',
      userPrompt:
        `Translate the following query into concise English keywords. Keep proper nouns.\nQuery: ${query}`,
      schema: translationSchema,
      shapeExample: '{ "translation": "example keywords" }',
      temperature: 0.1,
      maxTokens: 120
    },
    () => ({ translation: query })
  );

  const translation = result.translation?.trim();
  if (!translation || translation === query) {
    return { searchQuery: query, displayQuery: query, translationFailed: true };
  }

  return {
    searchQuery: translation,
    displayQuery: `${query} / ${translation}`,
    translationFailed: false
  };
};

const rankCitations = (citations: EvidenceCitation[]): EvidenceCitation[] => {
  return [...citations].sort((a, b) => {
    const citedDiff = (b.citedByCount ?? 0) - (a.citedByCount ?? 0);
    if (citedDiff !== 0) return citedDiff;
    return (b.year ?? 0) - (a.year ?? 0);
  });
};

const toConfidence = (citation: EvidenceCitation): EvidenceSuggestion['confidence'] => {
  const citedBy = citation.citedByCount ?? 0;
  if (citedBy >= 50) return 'high';
  if (citedBy >= 10) return 'medium';
  return 'low';
};

const buildSuggestionText = (routine: Routine, citation: EvidenceCitation): string => {
  const routineFocus = routine.purpose || routine.name;
  const yearSuffix = citation.year ? `（${citation.year}）` : '';
  const actionHint = routine.durationType === 'weekly'
    ? '週次でのブロック配分や休憩間隔を見直してみてください。'
    : '時間帯や休憩間隔の見直しを検討してみてください。';

  return `「${routineFocus}」に関連して、研究「${citation.title}」${yearSuffix}が参考になります。${actionHint}`;
};

export async function runEvidenceAdviceAgent({
  routine,
  userProfile,
  minEvidenceCount = 1
}: EvidenceAdviceAgentInput): Promise<EvidenceAdviceResult> {
  const query = buildEvidenceQuery(routine, userProfile);
  const warnings: string[] = [];

  if (!query) {
    warnings.push('検索クエリを生成できなかったため、提案を作成できませんでした。');
    return applyEvidencePolicy({ query, suggestions: [], warnings });
  }

  const { searchQuery, displayQuery, translationFailed } = await translateQueryToEnglish(query);
  if (translationFailed) {
    warnings.push('英語への自動翻訳が利用できないため、日本語クエリで検索しました。');
  }

  let citations: EvidenceCitation[] = [];
  try {
    const searchResult = await literatureSearchTool({
      query: searchQuery,
      perPage: 6,
      fromYear: new Date().getFullYear() - 15
    });
    citations = rankCitations(searchResult.citations);
  } catch (error) {
    warnings.push('論文 API の取得に失敗しました。時間を置いて再試行してください。');
    return applyEvidencePolicy({ query: displayQuery, suggestions: [], warnings });
  }

  if (citations.length < minEvidenceCount) {
    warnings.push('根拠となる文献が不足しているため、提案を作成できませんでした。');
    return applyEvidencePolicy({ query: displayQuery, suggestions: [], warnings });
  }

  const suggestions: EvidenceSuggestion[] = citations.slice(0, 3).map((citation) => ({
    id: generateUUID(),
    description: buildSuggestionText(routine, citation),
    evidence: [citation],
    confidence: toConfidence(citation)
  }));

  return applyEvidencePolicy({ query: displayQuery, suggestions, warnings });
}
