import { describe, it, expect } from 'vitest';
import { GDBB_STATS } from './gdbb-stats';

describe('GDBB stats constants', () => {
  it('contains benchmark instance count', () => {
    expect(GDBB_STATS.benchmark_instances).toBe(5400);
  });
});

