/**
 * Worker process giriş noktası.
 * Çalıştırma: pnpm run queue:dev
 * Trendyol sipariş senkronizasyonu için periyodik (15 dk) repeatable job'lar otomatik eklenir.
 */
import { redisConnectionForWorker } from './connection';
import { startWorkers } from './worker';
import { scheduleOrderSyncRepeatableJobs } from './schedule-order-sync';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redisHost = redisUrl.replace(/:[^/]*@/, '@').replace(/\/.*$/, '');
console.log(`Redis: ${redisHost}`);
console.log('(Uygulama (pnpm run dev) ile aynı REDIS_URL kullanılmalı; farklıysa kuyruk boş görünür)');

redisConnectionForWorker
  .ping()
  .then(async () => {
    console.log('Redis bağlantısı OK');
    startWorkers();
    await scheduleOrderSyncRepeatableJobs().catch((err) =>
      console.warn('Order-sync repeatable jobs atlandı:', (err as Error)?.message)
    );
    console.log('OmniCore workers running: xml-import, product-sync, marketplace-sync, order-sync, accounting, xml-feed, general');
  })
  .catch((err) => {
    console.error('Redis bağlantısı başarısız:', (err as Error)?.message ?? err);
    console.error('Worker çalışmaz. Redis\'i başlatın (örn. docker run -p 6379:6379 redis) ve REDIS_URL\'in doğru olduğundan emin olun.');
    process.exit(1);
  });
