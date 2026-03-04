const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const existing = hits.get(ip);

  if (!existing || now > existing.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

