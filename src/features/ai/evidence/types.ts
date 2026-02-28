export type EvidenceCitation = {
  sourceId: string;
  title: string;
  year?: number;
  venue?: string;
  authors?: string[];
  url?: string;
  citedByCount?: number;
};

export type EvidenceSuggestion = {
  id: string;
  description: string;
  evidence: EvidenceCitation[];
  confidence: 'low' | 'medium' | 'high';
};

export type EvidenceAdviceResult = {
  query: string;
  /** 表示用に整理した検索クエリ（目的・優先・制約を分けて表示） */
  displayQuery?: string;
  suggestions: EvidenceSuggestion[];
  warnings: string[];
  disclaimer: string;
};
