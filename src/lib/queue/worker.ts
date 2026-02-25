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
import { getAccountingIntegration } from '@/lib/integrations/IntegrationManager';
import type { AccountingProvider } from '@prisma/client';
import type { IntegrationCredentials } from '@/lib/integrations/types';

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

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)
    ),
  ]);
};

async function processMarketplaceSync(job: Job<JobDataMap['marketplace-sync']>) {
  const { storeId, type, productId, platform, connectionIds, jobId: dbJobId, totalProducts } = job.data;

  if (type !== 'product' || !productId) {
    await job.log(`Skipping ${type} (no productId)`);
    return { processed: true, storeId, type };
  }

  console.log('[marketplace-sync] Başlıyor: productId=', productId);

  if (dbJobId) {
    await prisma.job.update({
      where: { id: dbJobId },
      data: { status: JobStatus.ACTIVE, startedAt: new Date() },
    }).catch(() => {});
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      categories: { where: { isPrimary: true }, take: 1, include: { category: true } },
    },
  });
  if (!product) {
    throw new Error(`Ürün bulunamadı: ${productId}`);
  }
  console.log('[marketplace-sync] Ürün alındı: sku=', product.sku);

  const primaryCategory = product.categories[0]?.category;
  const categoryExternalId =
    primaryCategory?.externalId != null && primaryCategory.externalId !== ''
      ? parseInt(primaryCategory.externalId, 10)
      : null;
  let trendyolCategoryId =
    product.trendyolCategoryId ?? (Number.isNaN(categoryExternalId as number) ? null : categoryExternalId);
  let trendyolBrandId = product.trendyolBrandId ?? null;

  const connections = await prisma.marketplaceConnection.findMany({
    where: {
      storeId,
      isActive: true,
      ...(connectionIds?.length ? { id: { in: connectionIds } } : {}),
    },
  });
  if (connections.length === 0) {
    console.log('[marketplace-sync] Aktif pazaryeri bağlantısı yok, storeId=', storeId);
    await job.log(`Mağaza ${storeId} için aktif pazaryeri bağlantısı yok`);
    return { processed: true, storeId, type, sent: 0 };
  }
  console.log('[marketplace-sync] Bağlantı sayısı:', connections.length, 'platformlar:', connections.map((c) => c.platform).join(','));

  const hasTrendyol = connections.some((c) => c.platform === 'TRENDYOL');
  if (hasTrendyol && (trendyolBrandId == null || trendyolCategoryId == null)) {
    try {
      const { resolveTrendyolIds } = await import('@/services/trendyol-lookup');
      const categoryName = primaryCategory?.name ?? null;
      console.log('[marketplace-sync] Marka/kategori ID aranıyor (timeout 20s): brand=', product.brand ?? '-', 'category=', categoryName ?? '-');
      const resolved = await withTimeout(
        resolveTrendyolIds(storeId, product.brand ?? null, categoryName),
        20_000,
        'resolveTrendyolIds'
      );
      if (resolved.brandId != null) trendyolBrandId = resolved.brandId;
      if (resolved.categoryId != null) trendyolCategoryId = resolved.categoryId;
      if (trendyolBrandId != null || trendyolCategoryId != null) {
        await job.log(`Trendyol Marka/Kategori ID otomatik eşlendi (marka: ${product.brand ?? '-'}, kategori: ${categoryName ?? '-'})`);
      }
      console.log('[marketplace-sync] Marka/kategori eşlemesi bitti: brandId=', trendyolBrandId, 'categoryId=', trendyolCategoryId);
    } catch (e) {
      console.warn('[marketplace-sync] resolveTrendyolIds atlandı', { productId, error: (e as Error)?.message });
    }
  }

  const { getMarketplaceAdapter } = await import('@/services/marketplaces');
  const { getConnectionWithDecryptedCredentials, toAdapterConnection } = await import('@/lib/marketplace-connection');
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
    brandId: trendyolBrandId ?? undefined,
    categoryId: trendyolCategoryId != null ? String(trendyolCategoryId) : undefined,
  };

  const SEND_PRODUCT_TIMEOUT_MS = 60_000; // Trendyol API yanıt vermezse 60s sonra hata
  let sent = 0;
  for (const conn of connections) {
    try {
      console.log('[marketplace-sync] Bağlantı işleniyor:', conn.platform, conn.id);
      const decrypted = await getConnectionWithDecryptedCredentials(conn.id);
      if (!decrypted?.apiKey || !decrypted?.apiSecret) {
        await job.log(`${conn.platform}: API anahtarı/secret eksik, atlanıyor`);
        console.warn('[marketplace-sync] Credential eksik', {
          connectionId: conn.id,
          platform: conn.platform,
          hasApiKey: !!decrypted?.apiKey,
          hasApiSecret: !!decrypted?.apiSecret,
          sellerId: decrypted?.sellerId ?? '(yok)',
        });
        continue;
      }
      const connectionCredentials = toAdapterConnection(decrypted);
      console.log('[marketplace-sync] Gönderim yapılıyor:', conn.platform, 'sku=', product.sku);
      await job.log(
        `Gönderiliyor: sellerId=${connectionCredentials.sellerId} sku=${product.sku}`
      );
      const adapter = getMarketplaceAdapter(conn.platform);
      await withTimeout(
        adapter.sendProduct(marketplaceProduct, connectionCredentials),
        SEND_PRODUCT_TIMEOUT_MS,
        'sendProduct'
      );
      sent++;
      await job.log(`${product.sku} → ${conn.platform} gönderildi`);
      console.log('[marketplace-sync] Başarılı', { platform: conn.platform, sku: product.sku });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await job.log(`${conn.platform} hata: ${msg}`);
      console.error('[marketplace-sync] Hata', {
        connectionId: conn.id,
        platform: conn.platform,
        productSku: product.sku,
        error: msg,
      });
      throw err;
    }
  }

  if (dbJobId && totalProducts != null) {
    const row = await prisma.job.findUnique({ where: { id: dbJobId }, select: { result: true } });
    const result = (row?.result ?? {}) as { completed?: string[]; failed?: string[]; total?: number };
    const completed = [...(result.completed ?? []), productId];
    const done = completed.length >= totalProducts;
    await prisma.job.update({
      where: { id: dbJobId },
      data: {
        result: { ...result, completed, total: result.total ?? totalProducts },
        ...(done ? { status: JobStatus.COMPLETED, finishedAt: new Date() } : {}),
      },
    });
  }

  return { processed: true, storeId, type, sent };
}

function formatAddressForInvoice(addr: unknown): string {
  if (addr == null) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object' && addr !== null) {
    const o = addr as Record<string, unknown>;
    const parts = [
      o.addressLine1 ?? o.address ?? o.street,
      o.district ?? o.neighborhood,
      o.city,
      o.postalCode ?? o.zipCode,
      o.country,
    ].filter(Boolean);
    return parts.map(String).join(', ');
  }
  return '';
}

async function processAccounting(job: Job<JobDataMap['accounting']>) {
  const { storeId, type, orderId, payload } = job.data;
  await job.log(`Accounting ${type} store ${storeId} ${orderId ?? payload?.integrationId ?? '-'}`);

  if (type === 'sync') {
    const integrationId = (payload as { integrationId?: string } | undefined)?.integrationId;
    if (!integrationId) {
      await job.log('sync job: integrationId eksik');
      return { processed: true, storeId, type, error: 'integrationId eksik' };
    }
    const integration = await prisma.accountingIntegration.findFirst({
      where: { id: integrationId, storeId },
      select: { id: true, provider: true, credentials: true, settings: true },
    });
    if (!integration) {
      await job.log(`Entegrasyon bulunamadı: ${integrationId}`);
      return { processed: false, storeId, type, error: 'Entegrasyon bulunamadı' };
    }
    const creds = (integration.credentials as Record<string, unknown>) || {};
    const credentials: IntegrationCredentials = {
      apiKey: typeof creds.apiKey === 'string' ? creds.apiKey : undefined,
      apiSecret: typeof creds.apiSecret === 'string' ? creds.apiSecret : undefined,
      username: typeof creds.username === 'string' ? creds.username : undefined,
      password: typeof creds.password === 'string' ? creds.password : undefined,
      supplierId: typeof creds.supplierId === 'string' ? creds.supplierId : undefined,
      companyId: typeof creds.companyId === 'string' ? creds.companyId : undefined,
      clientId: typeof creds.clientId === 'string' ? creds.clientId : undefined,
      clientSecret: typeof creds.clientSecret === 'string' ? creds.clientSecret : undefined,
    };
    const settings = (integration.settings as Record<string, unknown>) || {};
    try {
      const adapter = getAccountingIntegration(
        integration.provider as AccountingProvider,
        storeId,
        credentials,
        settings
      );
      const ok = await adapter.healthCheck();
      await prisma.accountingIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          syncError: ok ? null : 'Bağlantı testi başarısız',
        },
      });
      await job.log(ok ? 'Sync (healthCheck) başarılı' : 'Sync (healthCheck) başarısız');
      return { processed: true, storeId, type, ok };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.accountingIntegration.update({
        where: { id: integrationId },
        data: { syncError: msg },
      });
      await job.log(`Sync hata: ${msg}`);
      throw e;
    }
  }

  if (type === 'einvoice_send' && orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, storeId },
      include: { items: true },
    });
    if (!order) {
      await job.log(`Sipariş bulunamadı: ${orderId}`);
      return { processed: false, storeId, type, error: 'Sipariş bulunamadı' };
    }
    const integration = await prisma.accountingIntegration.findFirst({
      where: { storeId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, provider: true, credentials: true, settings: true },
    });
    if (!integration) {
      await job.log('Mağazada aktif muhasebe entegrasyonu yok');
      return { processed: false, storeId, type, error: 'Aktif entegrasyon yok' };
    }
    const creds = (integration.credentials as Record<string, unknown>) || {};
    const credentials: IntegrationCredentials = {
      apiKey: typeof creds.apiKey === 'string' ? creds.apiKey : undefined,
      apiSecret: typeof creds.apiSecret === 'string' ? creds.apiSecret : undefined,
      username: typeof creds.username === 'string' ? creds.username : undefined,
      password: typeof creds.password === 'string' ? creds.password : undefined,
      supplierId: typeof creds.supplierId === 'string' ? creds.supplierId : undefined,
      companyId: typeof creds.companyId === 'string' ? creds.companyId : undefined,
      clientId: typeof creds.clientId === 'string' ? creds.clientId : undefined,
      clientSecret: typeof creds.clientSecret === 'string' ? creds.clientSecret : undefined,
    };
    const settings = (integration.settings as Record<string, unknown>) || {};
    const adapter = getAccountingIntegration(
      integration.provider as AccountingProvider,
      storeId,
      credentials,
      settings
    );
    const subtotal = Number(order.subtotal);
    const taxTotal = Number(order.taxTotal);
    const total = Number(order.total);
    const invoicePayload = {
      customerName: order.customerName ?? order.customerEmail ?? 'Müşteri',
      customerAddress: formatAddressForInvoice(order.shippingAddress),
      lines: order.items.map((item) => ({
        productCode: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
        taxAmount: Number(item.taxAmount),
        total: Number(item.total),
      })),
      subtotal,
      taxTotal,
      total,
      currency: order.currency ?? 'TRY',
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
    try {
      const result = await adapter.sendInvoice(invoicePayload);
      if (result.success && (result.invoiceId ?? result.invoiceUuid)) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            invoiceId: result.invoiceUuid ?? result.invoiceId ?? null,
            invoiceStatus: 'SENT',
          },
        });
        await prisma.accountingIntegration.update({
          where: { id: integration.id },
          data: { lastSyncAt: new Date(), syncError: null },
        });
        await job.log(`E-fatura gönderildi: ${result.invoiceUuid ?? result.invoiceId}`);
        return { processed: true, storeId, type, invoiceId: result.invoiceUuid ?? result.invoiceId };
      }
      const errMsg = result.error ?? 'Fatura gönderilemedi';
      await prisma.accountingIntegration.update({
        where: { id: integration.id },
        data: { syncError: errMsg },
      });
      await job.log(`E-fatura hata: ${errMsg}`);
      return { processed: false, storeId, type, error: errMsg };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.accountingIntegration.update({
        where: { id: integration.id },
        data: { syncError: msg },
      });
      await job.log(`E-fatura exception: ${msg}`);
      throw e;
    }
  }

  if (type === 'einvoice_query') {
    const invoiceId = (payload as { invoiceId?: string } | undefined)?.invoiceId;
    const orderIdForQuery = (payload as { orderId?: string } | undefined)?.orderId;
    let uuid = invoiceId;
    if (!uuid && orderIdForQuery) {
      const order = await prisma.order.findUnique({
        where: { id: orderIdForQuery, storeId },
        select: { invoiceId: true },
      });
      uuid = order?.invoiceId ?? undefined;
    }
    if (!uuid) {
      await job.log('einvoice_query: invoiceId veya orderId gerekli');
      return { processed: false, storeId, type, error: 'invoiceId veya orderId gerekli' };
    }
    const integration = await prisma.accountingIntegration.findFirst({
      where: { storeId, isActive: true },
      select: { id: true, provider: true, credentials: true, settings: true },
    });
    if (!integration) {
      return { processed: false, storeId, type, error: 'Aktif entegrasyon yok' };
    }
    const creds = (integration.credentials as Record<string, unknown>) || {};
    const credentials: IntegrationCredentials = {
      apiKey: typeof creds.apiKey === 'string' ? creds.apiKey : undefined,
      apiSecret: typeof creds.apiSecret === 'string' ? creds.apiSecret : undefined,
      username: typeof creds.username === 'string' ? creds.username : undefined,
      password: typeof creds.password === 'string' ? creds.password : undefined,
      supplierId: typeof creds.supplierId === 'string' ? creds.supplierId : undefined,
      companyId: typeof creds.companyId === 'string' ? creds.companyId : undefined,
      clientId: typeof creds.clientId === 'string' ? creds.clientId : undefined,
      clientSecret: typeof creds.clientSecret === 'string' ? creds.clientSecret : undefined,
    };
    const settings = (integration.settings as Record<string, unknown>) || {};
    const adapter = getAccountingIntegration(
      integration.provider as AccountingProvider,
      storeId,
      credentials,
      settings
    );
    try {
      const result = await adapter.queryInvoice(uuid);
      if (result.success && result.status && orderIdForQuery) {
        await prisma.order.update({
          where: { id: orderIdForQuery },
          data: {
            invoiceStatus:
              result.status === 'ACCEPTED'
                ? 'ACCEPTED'
                : result.status === 'REJECTED'
                  ? 'REJECTED'
                  : result.status === 'CANCELLED'
                    ? 'CANCELLED'
                    : 'SENT',
          },
        });
      }
      await job.log(`Fatura sorgulandı: ${result.status ?? result.error ?? 'ok'}`);
      return { processed: true, storeId, type, status: result.status };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await job.log(`Fatura sorgu hata: ${msg}`);
      throw e;
    }
  }

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
  const { storeId, type, payload = {} } = job.data;
  const p = payload as Record<string, unknown>;

  if (type === 'SMS_SEND') {
    const to = p.to as string | undefined;
    const message = p.message as string | undefined;
    const provider = (p.provider as string) || 'NETGSM';
    await job.log(`SMS (${provider}) to ${to ?? '?'}: ${message?.slice(0, 50) ?? ''}...`);
    // Stub: NetGSM / MasGSM API çağrısı ileride eklenecek
    if (!to || !message) {
      await job.log('SMS_SEND: to ve message gerekli');
      return { processed: false, storeId, type, error: 'to ve message gerekli' };
    }
    return { processed: true, storeId, type, to };
  }

  if (type === 'EMAIL_SEND') {
    const to = p.to as string | undefined;
    const subject = p.subject as string | undefined;
    const body = p.body as string | undefined;
    await job.log(`Email to ${to ?? '?'}: ${subject ?? '(konu yok)'}`);
    // Stub: SMTP gönderimi ileride eklenecek
    if (!to) {
      await job.log('EMAIL_SEND: to gerekli');
      return { processed: false, storeId, type, error: 'to gerekli' };
    }
    return { processed: true, storeId, type, to };
  }

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
    {
      connection: redisConnectionForWorker,
      concurrency: 2,
      lockDuration: 300_000,
      lockRenewTime: 15_000,
      maxStalledCount: 3,
      stalledInterval: 60_000,
    }
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

  workerMarketplace.on('active', (job) => {
    console.log(`[marketplace-sync] İş alındı: job ${job.id} productId=${(job.data as { productId?: string })?.productId ?? '-'}`);
  });

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
