import crypto from 'node:crypto';

type CacheValue = {
  sse: string;
  expiresAt: number;
};

const localCache = new Map<string, CacheValue>();

export function keyForSolvePayload(payload: unknown): string {
  const digest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return `solve_cache:${digest}`;
}

export function getCachedSse(key: string): string | null {
  const hit = localCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    localCache.delete(key);
    return null;
  }
  return hit.sse;
}

export function setCachedSse(key: string, sse: string, ttlMs = 5 * 60 * 1000): void {
  localCache.set(key, {
    sse,
    expiresAt: Date.now() + ttlMs,
  });
}

