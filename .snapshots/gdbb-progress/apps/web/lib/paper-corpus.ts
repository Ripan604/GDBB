export type PaperChunk = {
  id: string;
  section: string;
  reference: string;
  text: string;
};

export const PAPER_CHUNKS: PaperChunk[] = [
  {
    id: 's2-t2',
    section: 'Section 2',
    reference: 'Theorem 2 (Correctness)',
    text: 'GDBB remains complete because branch-and-bound only prunes nodes whose lower bound exceeds the incumbent upper bound.',
  },
  {
    id: 's3-t3',
    section: 'Section 3',
    reference: 'Theorem 3 (Time Complexity)',
    text: 'By combining decomposition and sigma-guided pruning, practical complexity tracks O(n² · 2^(n/log n)) rather than factorial growth.',
  },
  {
    id: 's4-t5',
    section: 'Section 4',
    reference: 'Theorem 5 (Approximation)',
    text: 'The epsilon approximation guarantees termination when (UB - LB)/UB <= epsilon and preserves bounded optimality gap.',
  },
  {
    id: 'tables',
    section: 'Tables I-III',
    reference: 'Benchmark Summary',
    text: 'Across 5,400 instances, reported average gap is 0.24% with 91.7% node pruning and major runtime reductions versus CPLEX.',
  },
];

