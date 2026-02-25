/**
 * Redis connection for BullMQ - tek instance, tüm kuyruklar paylaşır
 */

import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  password: redisPassword,
  retryStrategy(times) {
    return Math.min(times * 200, 5000);
  },
});

export const redisConnectionForWorker = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  password: redisPassword,
  retryStrategy(times) {
    return Math.min(times * 200, 5000);
  },
});
