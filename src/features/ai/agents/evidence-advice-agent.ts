import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';
import type { Routine } from '@/features/routines';
import { z } from 'zod';
import type { UserProfileContext } from '../types';
import type { EvidenceAdviceResult, EvidenceCitation, EvidenceSuggestion } from '../evidence/types';
import { literatureSearchTool } from '../tools/literature-search-tool';
import { applyEvidencePolicy } from '../tools/evidence-policy-tool';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import { getSystemPrompt } from '../evaluation/prompt-helper';

const generateUUID = createDefaultUUIDGenerator();

export type EvidenceAdviceAgentInput = {
  routine: Routine;
  userProfile: UserProfileContext;
  minEvidenceCount?: number;
};

/** 文献検索用：目的・優先・制約をそのまま連結したクエリ（フォールバック用） */
const buildEvidenceQuery = (routine: Routine, userProfile: UserProfileContext): string => {
  const parts = [
    routine.purpose,
    userProfile.priorities.join(' '),
    userProfile.constraints.join(' ')
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));

  return parts.join(' ').slice(0, 400);
};

const keywordsSchema = z.object({
  keywords: z.array(z.string().min(1)).min(2).max(8)
});

/**
 * 目的・優先・制約の「要素」から、文献検索用の英語キーワードを抽出する。
 * 長文をそのまま検索するよりヒット率が上がる。
 */
const extractSearchKeywords = async (
  routine: Routine,
  userProfile: UserProfileContext
): Promise<{ keywords: string[]; failed: boolean }> => {
  const displayQuery = buildDisplayQuery(routine, userProfile);
  if (!displayQuery.trim() || !isBedrockEnabled()) {
    return { keywords: [], failed: true };
  }

  try {
    const result = await invokeBedrockWithFallback(
      {
        systemPrompt:
          'You extract 3-6 English keywords for searching academic literature. ' +
          'Input: routine purpose, priorities, constraints (may be in Japanese). ' +
          'Output: short English terms that appear in research (e.g. time management, productivity, healthy lifestyle, work-life balance). ' +
          'One or two words per concept. No full sentences.',
        userPrompt: `Extract search keywords from:\n${displayQuery}\n\nOutput JSON: { "keywords": ["keyword1", "keyword2", ...] }`,
        schema: keywordsSchema,
        shapeExample: JSON.stringify({ keywords: ['time management', 'productivity', 'healthy lifestyle'] }),
        temperature: 0.2,
        maxTokens: 150
      },
      () => ({ keywords: [] })
    );
    const keywords = result.keywords?.filter((k) => k.trim().length > 0) ?? [];
    return { keywords, failed: keywords.length < 2 };
  } catch {
    return { keywords: [], failed: true };
  }
};

/** 表示用：目的・優先・制約を分けて重複を除き、見やすくする */
const buildDisplayQuery = (routine: Routine, userProfile: UserProfileContext): string => {
  const segs: string[] = [];
  if (routine.purpose?.trim()) segs.push(`目的: ${routine.purpose.trim()}`);
  const priorities = [...new Set(userProfile.priorities.filter((p) => p?.trim()))];
  if (priorities.length > 0) segs.push(`優先: ${priorities.join('、')}`);
  const constraints = [...new Set(userProfile.constraints.filter((c) => c?.trim()))];
  if (constraints.length > 0) segs.push(`制約: ${constraints.join('、')}`);
  return segs.join(' ｜ ');
};

const NON_ASCII_REGEX = /[^\x00-\x7F]/;

const translationSchema = z.object({
  translation: z.string()
});

const TRANSLATION_FALLBACK_PROMPT =
  'You translate short search queries into concise English keywords for academic literature search.';

/** 表示用テキストを日本語に翻訳（論文タイトル・説明文など） */
const translateToJapanese = async (text: string): Promise<string> => {
  if (!text.trim()) return text;
  if (!isBedrockEnabled()) return text;
  try {
    const result = await invokeBedrockWithFallback(
      {
        systemPrompt:
          'Translate the following text into natural Japanese. Preserve meaning; for academic paper titles use a natural Japanese translation. Keep well-known proper nouns in original if commonly used in Japanese (e.g. product names).',
        userPrompt: `Translate to Japanese:\n${text}`,
        schema: translationSchema,
        shapeExample: '{ "translation": "日本語のテキスト" }',
        temperature: 0.2,
        maxTokens: 500
      },
      () => ({ translation: text })
    );
    return result.translation?.trim() || text;
  } catch {
    return text;
  }
};

const translateQueryToEnglish = async (
  query: string,
  systemPrompt: string = TRANSLATION_FALLBACK_PROMPT
): Promise<{ searchQuery: string; displayQuery: string; translationFailed: boolean }> => {
  if (!NON_ASCII_REGEX.test(query)) {
    return { searchQuery: query, displayQuery: query, translationFailed: false };
  }

  if (!isBedrockEnabled()) {
    return { searchQuery: query, displayQuery: query, translationFailed: true };
  }

  const result = await invokeBedrockWithFallback(
    {
      systemPrompt,
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

const buildFallbackSuggestion = (routine: Routine): EvidenceSuggestion => {
  const actionHint = routine.durationType === 'weekly'
    ? '週次でのブロック配分や休憩間隔を見直してみてください。'
    : '時間帯や休憩間隔の見直しを検討してみてください。';

  return {
    id: generateUUID(),
    description: `一般的な観点として${actionHint}`,
    evidence: [],
    confidence: 'low'
  };
};

export async function runEvidenceAdviceAgent({
  routine,
  userProfile,
  minEvidenceCount = 1
}: EvidenceAdviceAgentInput): Promise<EvidenceAdviceResult> {
  const translationSystemPrompt = await getSystemPrompt('evidence-advice-agent').catch(() => TRANSLATION_FALLBACK_PROMPT);

  const query = buildEvidenceQuery(routine, userProfile);
  const warnings: string[] = [];

  const displayQuery = buildDisplayQuery(routine, userProfile);

  if (!query) {
    warnings.push('検索クエリを生成できなかったため、提案を作成できませんでした。');
    return applyEvidencePolicy({ query: '', displayQuery: '', suggestions: [], warnings });
  }

  // 要素からキーワードを抽出して検索（長文のまま検索するとヒット率が悪いため）
  const { keywords, failed: keywordsFailed } = await extractSearchKeywords(routine, userProfile);
  let searchQuery: string;
  let translationFailed = false;

  if (keywords.length >= 2) {
    searchQuery = keywords.join(' ');
  } else {
    const translated = await translateQueryToEnglish(query, translationSystemPrompt);
    searchQuery = translated.searchQuery;
    translationFailed = translated.translationFailed;
    if (translationFailed) {
      warnings.push('日本語のクエリで検索しました。（英語での検索は利用できませんでした）');
    }
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
    return applyEvidencePolicy({ query, displayQuery, suggestions: [], warnings });
  }

  if (citations.length < minEvidenceCount) {
    warnings.push('該当する研究文献は見つかりませんでした。一般的な観点からの提案です。');
    const fallbackSuggestion = buildFallbackSuggestion(routine);
    return applyEvidencePolicy({
      query,
      displayQuery,
      suggestions: [fallbackSuggestion],
      warnings
    });
  }

  const suggestionsRaw: EvidenceSuggestion[] = citations.slice(0, 3).map((citation) => ({
    id: generateUUID(),
    description: buildSuggestionText(routine, citation),
    evidence: [citation],
    confidence: toConfidence(citation)
  }));

  // 表示を日本語に統一：各提案文を日本語に翻訳
  const suggestions: EvidenceSuggestion[] = await Promise.all(
    suggestionsRaw.map(async (s) => ({
      ...s,
      description: await translateToJapanese(s.description)
    }))
  );

  return applyEvidencePolicy({ query, displayQuery, suggestions, warnings });
}
