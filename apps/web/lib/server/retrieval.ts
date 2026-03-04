import { PAPER_CHUNKS } from '@/lib/paper-corpus';

type RankedChunk = {
  section: string;
  reference: string;
  snippet: string;
  score: number;
};

function tokenize(input: string) {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

export function retrieveLocalChunks(query: string, topK = 3): RankedChunk[] {
  const q = new Set(tokenize(query));

  return PAPER_CHUNKS.map((c) => {
    const tokens = tokenize(c.text + ' ' + c.reference + ' ' + c.section);
    const score = tokens.reduce((acc, t) => acc + (q.has(t) ? 1 : 0), 0);
    return {
      section: c.section,
      reference: c.reference,
      snippet: c.text,
      score,
    };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function formatCitationBlock(chunks: RankedChunk[]): string {
  if (!chunks.length) return '';
  return chunks.map((c) => `- ${c.reference} (${c.section}): ${c.snippet}`).join('\n');
}

