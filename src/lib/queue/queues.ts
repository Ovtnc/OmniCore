/**
 * BullMQ Queue tanımları - Rate limit uyumlu job yapısı
 * Her queue ayrı concurrency ve rate limit ile çalışabilir
 */

import { Queue } from 'bullmq';
import { redisConnection } from './connection';

const defaultJobOptions = {
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
};

// Ürün toplu sync (Trendyol/Hepsiburada/XML import) - ağır işler arka planda
export const productSyncQueue = new Queue('product-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 3000 },
  },
});

// Pazaryeri sync - platform başına rate limit için ayrı queue tercih edilebilir
export const marketplaceSyncQueue = new Queue('marketplace-sync', {
  connection: redisConnection,
  defaultJobOptions,
});

// E-fatura / muhasebe - sıralı işlem için
export const accountingQueue = new Queue('accounting', {
  connection: redisConnection,
  defaultJobOptions,
});

// XML import - dosyayı indirir, parçalara ayırır, her ürünü DB'ye yazar ve marketplace-sync'e atar
export const xmlImportQueue = new Queue('xml-import', {
  connection: redisConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
  },
});

// XML üretim - ağır işler
export const xmlFeedQueue = new Queue('xml-feed', {
  connection: redisConnection,
  defaultJobOptions,
});

// Genel (SMS, e-posta, kargo, AI)
export const generalQueue = new Queue('general', {
  connection: redisConnection,
  defaultJobOptions,
});

export type JobDataMap = {
  'xml-import': {
    storeId: string;
    xmlUrl: string;
    jobId?: string;
    fieldMapping?: Record<string, string>;
    variantMapping?: Array<{ attributeKey: string; xmlTag: string }>;
    /** true ise ürünler pazaryerine otomatik gönderilmez; Ürünler sayfasından "Mağazaya yolla" ile gönderilir */
    skipMarketplaceSync?: boolean;
    /** true ise ürünler Product yerine XmlImportItem'a yazılır; ön izleme sonrası seçilenler aktarılır */
    selectiveImport?: boolean;
    /** selectiveImport true ise önceden oluşturulmuş batch id */
    batchId?: string;
  };
  'product-sync': {
    storeId: string;
    jobId?: string; // Prisma Job.id - durum güncellemesi için
    type: 'marketplace' | 'xml_import';
    productIds?: string[];
    xmlUrl?: string;
    platform?: string;
    connectionId?: string;
    payload?: Record<string, unknown>;
  };
  'marketplace-sync': {
    storeId: string;
    type: 'product' | 'order' | 'stock';
    platform: string;
    payload: Record<string, unknown>;
    listingId?: string;
    productId?: string;
    /** Sadece bu bağlantılara gönder; yoksa tüm aktif bağlantılar */
    connectionIds?: string[];
    /** Prisma Job.id - UI'da iş listesi için; worker tamamlayınca günceller */
    jobId?: string;
    /** Toplam ürün sayısı (jobId ile birlikte; tamamlanan sayıyla karşılaştırılır) */
    totalProducts?: number;
  };
  accounting: {
    storeId: string;
    type: 'einvoice_send' | 'einvoice_query' | 'sync';
    orderId?: string;
    payload?: Record<string, unknown>;
  };
  'xml-feed': {
    storeId: string;
    feedId: string;
    b2bCustomerId?: string;
  };
  general: {
    storeId: string;
    type: string;
    payload: Record<string, unknown>;
  };
};
