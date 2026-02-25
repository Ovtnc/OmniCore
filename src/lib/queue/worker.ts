/**
 * BullMQ Worker - Job'ları işler, rate limit aşmadan.
 * Ağır işler (10k ürün XML, pazaryeri sync) API'yi bloke etmez.
 */

import { Worker, Job } from 'bullmq';
import { redisConnectionForWorker } from './connection';
import {
  marketplaceSyncQueue,
  accountingQueue,
  xmlFeedQueue,
  generalQueue,
} from './queues';
import type { JobDataMap } from './queues';
import { prisma } from '@/lib/prisma';
import { JobStatus, Prisma } from '@prisma/client';

const concurrency = parseInt(process.env.QUEUE_CONCURRENCY ?? '5', 10);

async function processProductSync(job: Job<JobDataMap['product-sync']>) {
  const { storeId, jobId: dbJobId, type, productIds, xmlUrl, platform } = job.data;

  if (dbJobId) {
    await prisma.job.update({
      where: { id: dbJobId },
      data: { status: JobStatus.ACTIVE, startedAt: new Date() },
    });
  }

  try {
    if (type === 'marketplace' && productIds?.length) {
      await job.log(`Syncing ${productIds.length} products to ${platform ?? 'marketplace'}`);
      // TODO: getMarketplaceIntegration(platform, storeId, creds) -> batch syncProduct
      for (let i = 0; i < Math.min(productIds.length, 100); i++) {
        await job.updateProgress(((i + 1) / Math.min(productIds.length, 100)) * 100);
      }
    } else if (type === 'xml_import' && xmlUrl) {
      await job.log(`Processing XML import from ${xmlUrl}`);
      const { parseXmlToProducts } = await import('@/services/xml/xml-parser');
      const parseResult = await parseXmlToProducts(storeId, xmlUrl, {
        batchSize: 50,
        onProgress: async (processed, total) => {
          await job.updateProgress(total > 0 ? (processed / total) * 100 : 0);
        },
      });
      if (dbJobId) {
        await prisma.job.update({
          where: { id: dbJobId },
          data: {
            status: JobStatus.COMPLETED,
            finishedAt: new Date(),
            result: {
              type: 'xml_import',
              ...parseResult,
            },
          },
        });
        return { processed: true, storeId, type, ...parseResult };
      }
      return { processed: true, storeId, type, ...parseResult };
    }

    if (dbJobId) {
      await prisma.job.update({
        where: { id: dbJobId },
        data: {
          status: JobStatus.COMPLETED,
          finishedAt: new Date(),
          result: { productCount: productIds?.length ?? 0, type },
        },
      });
    }
    return { processed: true, storeId, type, count: productIds?.length ?? 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (dbJobId) {
      await prisma.job.update({
        where: { id: dbJobId },
        data: {
          status: JobStatus.FAILED,
          finishedAt: new Date(),
          error: message,
        },
      });
    }
    throw err;
  }
}

async function processMarketplaceSync(job: Job<JobDataMap['marketplace-sync']>) {
  const { storeId, type, productId, platform } = job.data;

  if (type !== 'product' || !productId) {
    await job.log(`Skipping ${type} (no productId)`);
    return { processed: true, storeId, type };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!product) {
    throw new Error(`Ürün bulunamadı: ${productId}`);
  }

  const connections = await prisma.marketplaceConnection.findMany({
    where: { storeId, isActive: true },
  });
  if (connections.length === 0) {
    await job.log(`Mağaza ${storeId} için aktif pazaryeri bağlantısı yok`);
    return { processed: true, storeId, type, sent: 0 };
  }

  const { getMarketplaceAdapter } = await import('@/services/marketplaces');
  const marketplaceProduct = {
    sku: product.sku,
    name: product.name,
    description: product.description ?? undefined,
    barcode: product.barcode ?? undefined,
    salePrice: Number(product.salePrice),
    listPrice: Number(product.listPrice),
    stockQuantity: product.stockQuantity,
    quantity: product.stockQuantity,
    images: product.images.map((img) => ({ url: img.url })),
  };

  let sent = 0;
  for (const conn of connections) {
    try {
      const adapter = getMarketplaceAdapter(conn.platform);
      const connectionCredentials = {
        apiKey: conn.apiKey ?? undefined,
        apiSecret: conn.apiSecret ?? undefined,
        sellerId: conn.sellerId ?? undefined,
        supplierId: conn.sellerId ?? undefined,
      };
      await adapter.sendProduct(marketplaceProduct, connectionCredentials);
      sent++;
      await job.log(`${product.sku} → ${conn.platform} gönderildi`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await job.log(`${conn.platform} hata: ${msg}`);
      throw err;
    }
  }
  return { processed: true, storeId, type, sent };
}

async function processAccounting(job: Job<JobDataMap['accounting']>) {
  const { storeId, type, orderId } = job.data;
  await job.log(`Accounting ${type} store ${storeId} order ${orderId ?? '-'}`);
  return { processed: true, storeId, type };
}

async function processXmlImport(job: Job<JobDataMap['xml-import']>) {
  const { storeId, xmlUrl, jobId: dbJobId, fieldMapping, variantMapping, skipMarketplaceSync, selectiveImport, batchId } = job.data;

  if (dbJobId) {
    await prisma.job.update({
      where: { id: dbJobId },
      data: { status: JobStatus.ACTIVE, startedAt: new Date() },
    });
  }

  await job.log(`XML import başladı: ${xmlUrl}${selectiveImport ? ' (seçimli ön izleme)' : ''}`);

  try {
    if (selectiveImport && batchId) {
      const { processXmlFeedToBatch } = await import('@/services/xml/xml-processor');
      const result = await processXmlFeedToBatch(storeId, xmlUrl, batchId, {
        fieldMapping,
        variantMapping,
        onProgress: dbJobId
          ? async (processed, total, partial) => {
              await prisma.job.update({
                where: { id: dbJobId },
                data: {
                  result: {
                    total,
                    processed,
                    created: partial.created,
                    failed: partial.failed,
                    batchId: partial.batchId,
                  } as unknown as Prisma.InputJsonValue,
                },
              });
            }
          : undefined,
      });
      const jobResult = { ...result, batchId: result.batchId };
      if (dbJobId) {
        await prisma.job.update({
          where: { id: dbJobId },
          data: {
            status: JobStatus.COMPLETED,
            finishedAt: new Date(),
            result: jobResult as unknown as Prisma.InputJsonValue,
          },
        });
      }
      await job.log(`Seçimli XML import tamamlandı: ${result.created} ürün ön izlemeye eklendi`);
      return jobResult;
    }

    const { processXmlFeed } = await import('@/services/xml/xml-processor');
    const result = await processXmlFeed(storeId, xmlUrl, {
      fieldMapping,
      variantMapping,
      skipMarketplaceSync,
      onProgress: dbJobId
        ? async (processed, total, partial) => {
            await prisma.job.update({
              where: { id: dbJobId },
              data: {
                result: {
                  total,
                  processed,
                  queued: partial.queued,
                  created: partial.created,
                  updated: partial.updated,
                  failed: partial.failed,
                } as unknown as Prisma.InputJsonValue,
              },
            });
          }
        : undefined,
    });

    if (dbJobId) {
      await prisma.job.update({
        where: { id: dbJobId },
        data: {
          status: JobStatus.COMPLETED,
          finishedAt: new Date(),
          result: result as unknown as Prisma.InputJsonValue,
        },
      });
    }
    await job.log(
      `XML import tamamlandı: ${result.total} ürün, ${result.queued} kuyruğa atıldı`
    );
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (dbJobId) {
      await prisma.job.update({
        where: { id: dbJobId },
        data: {
          status: JobStatus.FAILED,
          finishedAt: new Date(),
          error: message,
        },
      });
    }
    throw err;
  }
}

async function processXmlFeed(job: Job<JobDataMap['xml-feed']>) {
  const { storeId, feedId } = job.data;
  await job.log(`Generating XML feed ${feedId} store ${storeId}`);
  return { processed: true, storeId, feedId };
}

async function processGeneral(job: Job<JobDataMap['general']>) {
  const { storeId, type } = job.data;
  await job.log(`General job ${type} store ${storeId}`);
  return { processed: true, storeId, type };
}

export function startWorkers() {
  const workerXmlImport = new Worker<JobDataMap['xml-import']>(
    'xml-import',
    processXmlImport,
    { connection: redisConnectionForWorker, concurrency: 1 }
  );

  const workerProductSync = new Worker<JobDataMap['product-sync']>(
    'product-sync',
    processProductSync,
    { connection: redisConnectionForWorker, concurrency: 2 }
  );

  const workerMarketplace = new Worker<JobDataMap['marketplace-sync']>(
    'marketplace-sync',
    processMarketplaceSync,
    { connection: redisConnectionForWorker, concurrency }
  );

  const workerAccounting = new Worker<JobDataMap['accounting']>(
    'accounting',
    processAccounting,
    { connection: redisConnectionForWorker, concurrency: 2 }
  );

  const workerXml = new Worker<JobDataMap['xml-feed']>(
    'xml-feed',
    processXmlFeed,
    { connection: redisConnectionForWorker, concurrency: 2 }
  );

  const workerGeneral = new Worker<JobDataMap['general']>(
    'general',
    processGeneral,
    { connection: redisConnectionForWorker, concurrency }
  );

  [workerXmlImport, workerProductSync, workerMarketplace, workerAccounting, workerXml, workerGeneral].forEach(
    (w) => {
      w.on('completed', (job) => console.log(`[${job.queueName}] Job ${job.id} completed`));
      w.on('failed', (job, err) =>
        console.error(`[${job?.queueName}] Job ${job?.id} failed`, err?.message)
      );
    }
  );

  return {
    workerXmlImport,
    workerProductSync,
    workerMarketplace,
    workerAccounting,
    workerXml,
    workerGeneral,
  };
}

// Worker'ı başlatmak için: pnpm run queue:dev (run-workers.ts kullanır)
