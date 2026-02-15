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
  suggestions: EvidenceSuggestion[];
  warnings: string[];
  disclaimer: string;
};
