import { Worker, QueueEvents } from 'bullmq';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const parsedRedis = new URL(redisUrl);
const connection = {
  host: parsedRedis.hostname,
  port: Number(parsedRedis.port || 6379),
  username: parsedRedis.username || undefined,
  password: parsedRedis.password || undefined,
};

const queueName = 'gdbb-heavy-jobs';

const worker = new Worker(
  queueName,
  async (job) => {
    const engine = process.env.ENGINE_BASE_URL ?? 'http://localhost:8000';
    const endpoint = `${engine}/solve/${job.name}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job.data),
    });

    if (!res.ok) {
      throw new Error(`Engine solve failed: ${res.status}`);
    }

    return { accepted: true, endpoint, at: new Date().toISOString() };
  },
  { connection },
);

const events = new QueueEvents(queueName, { connection });

events.on('completed', ({ jobId }) => {
  console.log(`[worker] job completed: ${jobId}`);
});

events.on('failed', ({ jobId, failedReason }) => {
  console.error(`[worker] job failed: ${jobId} reason=${failedReason}`);
});

console.log(`[worker] listening on queue=${queueName}`);

process.on('SIGINT', async () => {
  await worker.close();
  await events.close();
  process.exit(0);
});

