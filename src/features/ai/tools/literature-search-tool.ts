import type { EvidenceCitation } from '../evidence/types';

type OpenAlexWork = {
  id?: string;
  title?: string;
  doi?: string | null;
  publication_year?: number;
  host_venue?: { display_name?: string | null } | null;
  authorships?: Array<{ author?: { display_name?: string | null } | null }>;
  cited_by_count?: number;
};

type OpenAlexResponse = {
  results?: OpenAlexWork[];
};

export type LiteratureSearchInput = {
  query: string;
  perPage?: number;
  fromYear?: number;
};

export type LiteratureSearchResult = {
  query: string;
  citations: EvidenceCitation[];
};

const OPENALEX_BASE_URL = 'https://api.openalex.org/works';

const normalizeDoiUrl = (doi?: string | null): string | undefined => {
  if (!doi) return undefined;
  const normalized = doi.replace(/^doi:/i, '').trim();
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }
  return `https://doi.org/${normalized}`;
};

const mapOpenAlexWorkToCitation = (work: OpenAlexWork): EvidenceCitation | null => {
  const title = work.title?.trim();
  const id = work.id?.trim();
  if (!title || !id) return null;

  const doiUrl = normalizeDoiUrl(work.doi ?? undefined);
  const authors = work.authorships
    ?.map((authorship) => authorship.author?.display_name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 3);

  return {
    sourceId: doiUrl ?? id,
    title,
    year: work.publication_year ?? undefined,
    venue: work.host_venue?.display_name ?? undefined,
    authors: authors && authors.length > 0 ? authors : undefined,
    url: doiUrl ?? id,
    citedByCount: work.cited_by_count ?? undefined
  };
};

export async function literatureSearchTool({
  query,
  perPage = 5,
  fromYear
}: LiteratureSearchInput): Promise<LiteratureSearchResult> {
  const apiKey = process.env.OPENALEX_API_KEY;
  const mailto = process.env.OPENALEX_MAILTO;

  const url = new URL(OPENALEX_BASE_URL);
  url.searchParams.set('search', query);
  url.searchParams.set('per-page', String(perPage));
  if (apiKey) {
    url.searchParams.set('api_key', apiKey);
  }
  if (mailto) {
    url.searchParams.set('mailto', mailto);
  }
  if (fromYear) {
    url.searchParams.set('filter', `from_publication_date:${fromYear}-01-01`);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`OpenAlex API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenAlexResponse;
  const citations = (data.results ?? [])
    .map(mapOpenAlexWorkToCitation)
    .filter((item): item is EvidenceCitation => Boolean(item));

  return {
    query,
    citations
  };
}
