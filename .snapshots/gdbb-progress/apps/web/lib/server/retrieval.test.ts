import { describe, it, expect } from 'vitest';
import { retrieveLocalChunks, formatCitationBlock } from './retrieval';

describe('retrieval', () => {
  it('returns ranked chunks for query', () => {
    const chunks = retrieveLocalChunks('time complexity theorem');
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.reference).toBeTruthy();
  });

  it('formats citations', () => {
    const text = formatCitationBlock([
      { section: 'Section 2', reference: 'Theorem 2', snippet: 'Correctness', score: 3 },
    ]);
    expect(text).toContain('Theorem 2');
  });
});

