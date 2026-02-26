import type { JobStatus, JobType } from '@prisma/client';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export type NotificationItem = {
  id: string;
  jobId: string;
  storeId: string;
  storeName: string;
  type: JobType;
  status: JobStatus;
  createdAt: string;
  finishedAt: string | null;
  title: string;
  message: string;
  href: string;
  severity: NotificationSeverity;
  productSummaries: string[];
  pendingCount?: number;
};

type ProductMap = Record<string, { sku: string; name: string }>;

function toObject(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function getJobHref(type: JobType): string {
  switch (type) {
    case 'MARKETPLACE_SYNC_PRODUCT':
    case 'MARKETPLACE_SYNC_STOCK':
    case 'XML_GENERATE':
      return '/products';
    case 'MARKETPLACE_SYNC_ORDER':
      return '/orders';
    case 'ACCOUNTING_SYNC':
    case 'EINVOICE_SEND':
    case 'EINVOICE_QUERY':
      return '/accounting';
    case 'CARGO_CREATE':
      return '/logistics';
    case 'AI_CATEGORY_MATCH':
    case 'AI_QA_RESPONSE':
      return '/support';
    default:
      return '/tools';
  }
}

function getJobTitle(type: JobType): string {
  switch (type) {
    case 'MARKETPLACE_SYNC_PRODUCT':
      return 'Pazaryeri ürün güncellemesi';
    case 'MARKETPLACE_SYNC_ORDER':
      return 'Pazaryeri sipariş eşitlemesi';
    case 'MARKETPLACE_SYNC_STOCK':
      return 'Pazaryeri stok güncellemesi';
    case 'XML_GENERATE':
      return 'XML içe aktarma';
    case 'ACCOUNTING_SYNC':
      return 'Muhasebe senkronizasyonu';
    case 'EINVOICE_SEND':
      return 'E-fatura gönderimi';
    case 'EINVOICE_QUERY':
      return 'E-fatura sorgusu';
    case 'CARGO_CREATE':
      return 'Kargo işlemi';
    case 'AI_CATEGORY_MATCH':
      return 'AI kategori eşleştirme';
    case 'AI_QA_RESPONSE':
      return 'AI müşteri yanıtı';
    case 'SMS_SEND':
      return 'SMS gönderimi';
    case 'EMAIL_SEND':
      return 'E-posta gönderimi';
    default:
      return type;
  }
}

export function collectProductIds(payload: unknown, result: unknown): string[] {
  const ids = new Set<string>();

  const pObj = toObject(payload);
  if (pObj) {
    for (const id of toStringArray(pObj.productIds)) ids.add(id);
    if (typeof pObj.productId === 'string') ids.add(pObj.productId);
  }

  const rObj = toObject(result);
  if (rObj) {
    for (const id of toStringArray(rObj.completed)) ids.add(id);
    for (const id of toStringArray(rObj.failed)) ids.add(id);
  }

  return Array.from(ids);
}

export function buildNotification(params: {
  id: string;
  jobId: string;
  storeId: string;
  storeName: string;
  type: JobType;
  status: JobStatus;
  payload: unknown;
  result: unknown;
  error: string | null;
  createdAt: Date;
  finishedAt: Date | null;
  productMap: ProductMap;
}): NotificationItem {
  const {
    id,
    jobId,
    storeId,
    storeName,
    type,
    status,
    payload,
    result,
    error,
    createdAt,
    finishedAt,
    productMap,
  } = params;

  const title = getJobTitle(type);
  const href = getJobHref(type);
  const resultObj = toObject(result);
  const pendingCount =
    resultObj && typeof resultObj.total === 'number' && Array.isArray(resultObj.completed)
      ? Math.max(0, resultObj.total - resultObj.completed.length)
      : undefined;

  const productIds = collectProductIds(payload, result);
  const productSummaries = productIds
    .map((id) => productMap[id])
    .filter(Boolean)
    .slice(0, 4)
    .map((p) => `${p.sku} · ${p.name}`);

  let message = '';
  let severity: NotificationSeverity = 'info';

  if (status === 'FAILED') {
    message = error || 'İş başarısız oldu.';
    severity = 'error';
  } else if (status === 'ACTIVE' || status === 'PENDING') {
    message =
      pendingCount != null
        ? `İşlem devam ediyor. Kalan: ${pendingCount}`
        : 'İşlem sırada / devam ediyor.';
    severity = 'warning';
  } else if (status === 'COMPLETED') {
    if (productSummaries.length > 0) {
      message = `Tamamlandı. Ürünler: ${productSummaries.join(' | ')}`;
    } else if (resultObj && typeof resultObj === 'object') {
      const created = typeof resultObj.created === 'number' ? resultObj.created : undefined;
      const updated = typeof resultObj.updated === 'number' ? resultObj.updated : undefined;
      const queued = typeof resultObj.queued === 'number' ? resultObj.queued : undefined;
      const parts = [
        created != null ? `Yeni: ${created}` : null,
        updated != null ? `Güncellenen: ${updated}` : null,
        queued != null ? `Kuyruğa alındı: ${queued}` : null,
      ].filter(Boolean);
      message = parts.length > 0 ? `Tamamlandı. ${parts.join(' · ')}` : 'İşlem tamamlandı.';
    } else {
      message = 'İşlem tamamlandı.';
    }
    severity = 'success';
  } else {
    message = 'İşlem güncellendi.';
    severity = 'info';
  }

  return {
    id,
    jobId,
    storeId,
    storeName,
    type,
    status,
    createdAt: createdAt.toISOString(),
    finishedAt: finishedAt ? finishedAt.toISOString() : null,
    title,
    message,
    href,
    severity,
    productSummaries,
    ...(pendingCount != null ? { pendingCount } : {}),
  };
}

