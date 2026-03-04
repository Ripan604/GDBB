import { Queue } from 'bullmq';

let queue: Queue | null = null;

export function getQueue() {
  if (queue) return queue;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  const parsed = new URL(redisUrl);
  const connection = {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
  };
  queue = new Queue('gdbb-heavy-jobs', { connection });
  return queue;
}


