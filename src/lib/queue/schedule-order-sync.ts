/**
 * Periyodik Trendyol sipariş senkronizasyonu.
 * Worker ayağa kalktığında aktif Trendyol bağlantısı olan mağazalar için
 * tekrarlayan job kaydedilir (varsayılan: 15 dakikada bir).
 */

import { orderSyncQueue } from './queues';
import { prisma } from '@/lib/prisma';

const ORDER_SYNC_REPEAT_MS = 15 * 60 * 1000; // 15 dakika

export async function scheduleOrderSyncRepeatableJobs(): Promise<void> {
  const connections = await prisma.marketplaceConnection.findMany({
    where: { platform: 'TRENDYOL', isActive: true },
    select: { storeId: true },
    distinct: ['storeId'],
  });

  for (const { storeId } of connections) {
    const jobId = `order-sync-repeat-${storeId}`;
    try {
      await orderSyncQueue.add(
        'order-sync',
        {
          storeId,
          platform: 'TRENDYOL',
          lastDays: 7,
          jobId: undefined,
        },
        {
          jobId,
          repeat: { every: ORDER_SYNC_REPEAT_MS },
          removeOnComplete: { count: 10 },
        }
      );
      console.log(`[order-sync] Repeatable job eklendi: storeId=${storeId}`);
    } catch (err) {
      console.warn(`[order-sync] Repeatable job eklenemedi (storeId=${storeId}):`, (err as Error)?.message);
    }
  }
}
