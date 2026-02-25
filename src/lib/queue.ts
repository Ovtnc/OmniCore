/**
 * OmniCore - BullMQ merkezi giriş noktası
 * API route'ları buradan kuyruk ekler; ağır işler worker'da arka planda çalışır.
 * 10.000 ürünlük XML yüklemede yanıt anında döner, iş worker'da işlenir.
 */

import { JobType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { productSyncQueue, xmlImportQueue } from './queue/queues';
import type { JobDataMap } from './queue/queues';

export { redisConnection } from './queue/connection';
export {
  productSyncQueue,
  marketplaceSyncQueue,
  xmlImportQueue,
  accountingQueue,
  xmlFeedQueue,
  generalQueue,
} from './queue/queues';
export type { JobDataMap } from './queue/queues';
export { startWorkers } from './queue/worker';

/**
 * Ürün sync işini kuyruğa ekler; Prisma Job kaydı oluşturur.
 * API hemen jobId döner, client durumu polling ile takip edebilir.
 */
export async function addProductSyncJob(
  storeId: string,
  data: Omit<JobDataMap['product-sync'], 'storeId' | 'jobId'>
): Promise<{ jobId: string }> {
  const job = await prisma.job.create({
    data: {
      storeId,
      type:
        data.type === 'marketplace'
          ? JobType.MARKETPLACE_SYNC_PRODUCT
          : JobType.XML_GENERATE,
      status: 'PENDING',
      payload: (data ? (data as Prisma.InputJsonValue) : undefined),
    },
  });
  await productSyncQueue.add('sync', { ...data, storeId, jobId: job.id });
  return { jobId: job.id };
}

/**
 * XML import işini kuyruğa ekler. Worker XML'i indirir, ürünleri DB'ye yazar ve
 * her ürün için marketplace-sync job'ı oluşturur.
 * selectiveImport: true ise ürünler geçici XmlImportItem tablosuna yazılır, batchId döner.
 */
export async function addXmlImportJob(
  storeId: string,
  xmlUrl: string,
  options?: {
    fieldMapping?: Record<string, string>;
    variantMapping?: Array<{ attributeKey: string; xmlTag: string }>;
    skipMarketplaceSync?: boolean;
    selectiveImport?: boolean;
  }
): Promise<{ jobId: string; batchId?: string }> {
  let batchId: string | undefined;
  if (options?.selectiveImport) {
    try {
      const batch = await prisma.xmlImportBatch.create({
        data: { storeId, xmlUrl, status: 'PENDING', totalCount: 0 },
      });
      batchId = batch.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("undefined (reading 'create')") || msg.includes('xmlImportBatch')) {
        throw new Error(
          'Seçimli içe aktarım için Prisma client güncel değil. Lütfen "pnpm prisma generate" çalıştırıp dev sunucusunu ve queue worker\'ı yeniden başlatın.'
        );
      }
      throw err;
    }
  }
  const payload = {
    xmlUrl,
    fieldMapping: options?.fieldMapping,
    variantMapping: options?.variantMapping,
    skipMarketplaceSync: options?.skipMarketplaceSync,
    selectiveImport: options?.selectiveImport,
    batchId,
  };
  const job = await prisma.job.create({
    data: {
      storeId,
      type: JobType.XML_GENERATE,
      status: 'PENDING',
      payload: payload as Prisma.InputJsonValue,
    },
  });
  await xmlImportQueue.add(`xml-import-${storeId}-${Date.now()}`, {
    storeId,
    xmlUrl,
    jobId: job.id,
    fieldMapping: options?.fieldMapping,
    variantMapping: options?.variantMapping,
    skipMarketplaceSync: options?.skipMarketplaceSync,
    selectiveImport: options?.selectiveImport,
    batchId,
  });
  return { jobId: job.id, batchId };
}
