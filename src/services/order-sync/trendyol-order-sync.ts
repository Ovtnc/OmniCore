/**
 * Trendyol sipariş senkronizasyonu: API'den çek, normalize et, Order/OrderItem olarak upsert et.
 */

import { prisma } from '@/lib/prisma';
import { getMarketplaceAdapter } from '@/services/marketplaces';
import { getConnectionWithDecryptedCredentials, toAdapterConnection } from '@/lib/marketplace-connection';
import type { NormalizedOrderPayload } from '@/services/marketplaces/types';
import type { OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const TRENDYOL_ORDER_NUMBER_PREFIX = 'TY-';

export interface SyncTrendyolOrdersOptions {
  /** Belirli bağlantı; yoksa mağazanın ilk aktif Trendyol bağlantısı */
  connectionId?: string;
  /** Son N gün (örn. 7); startDate/endDate verilmezse kullanılır */
  lastDays?: number;
  /** Unix timestamp (ms). API max 2 haftalık aralık kabul eder */
  startDate?: number;
  /** Unix timestamp (ms) */
  endDate?: number;
  /** Trendyol durum filtresi: Created, Picking, Invoiced, Shipped, Delivered, Cancelled, vb. */
  status?: string;
  /** Sayfa boyutu (varsayılan 50) */
  pageSize?: number;
}

export interface SyncTrendyolOrdersResult {
  storeId: string;
  connectionId: string;
  ordersFetched: number;
  ordersUpserted: number;
  ordersFailed: number;
  errors: string[];
}

function toDecimal(n: number): Decimal {
  return new Decimal(n);
}

function mapToOrderStatus(s: string): OrderStatus {
  const status = s as OrderStatus;
  const valid: OrderStatus[] = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ];
  return valid.includes(status) ? status : 'PENDING';
}

/**
 * SKU ile ürün bulur; yoksa minimal bir Product oluşturur (OrderItem productId zorunluluğu için).
 * Upsert ile race condition önlenir.
 */
async function ensureProductForOrderItem(
  storeId: string,
  sku: string,
  name: string,
  unitPrice: number
): Promise<string> {
  const slug = `trendyol-${sku}`.replace(/[^a-z0-9-]/gi, '-').slice(0, 180);
  const product = await prisma.product.upsert({
    where: { storeId_sku: { storeId, sku } },
    create: {
      storeId,
      sku,
      name: name || sku,
      slug,
      listPrice: toDecimal(unitPrice),
      salePrice: toDecimal(unitPrice),
      stockQuantity: 0,
      isActive: false,
    },
    update: {},
    select: { id: true },
  });
  return product.id;
}

/**
 * Tek bir normalize edilmiş siparişi Order + OrderItem olarak upsert eder.
 */
async function upsertOrderFromPayload(
  storeId: string,
  marketplaceConnectionId: string,
  payload: NormalizedOrderPayload
): Promise<{ upserted: boolean; orderId: string }> {
  const orderNumber =
    payload.orderNumber?.startsWith(TRENDYOL_ORDER_NUMBER_PREFIX) ||
    /^\d+$/.test(payload.orderNumber ?? '')
      ? `${TRENDYOL_ORDER_NUMBER_PREFIX}${payload.marketplaceOrderId}`
      : payload.orderNumber ?? `${TRENDYOL_ORDER_NUMBER_PREFIX}${payload.marketplaceOrderId}`;

  const order = await prisma.order.upsert({
    where: {
      storeId_orderNumber: { storeId, orderNumber },
    },
    create: {
      storeId,
      marketplaceConnectionId,
      marketplaceOrderId: payload.marketplaceOrderId,
      platform: 'TRENDYOL',
      channel: 'TRENDYOL',
      orderNumber,
      status: mapToOrderStatus(payload.status),
      customerEmail: payload.customerEmail ?? undefined,
      customerPhone: payload.customerPhone ?? undefined,
      customerName: payload.customerName ?? undefined,
      shippingAddress: payload.shippingAddress as object,
      billingAddress: (payload.billingAddress ?? undefined) as object | undefined,
      subtotal: toDecimal(payload.subtotal),
      taxTotal: toDecimal(payload.taxTotal),
      shippingCost: toDecimal(payload.shippingCost ?? 0),
      discountTotal: toDecimal(payload.discountTotal ?? 0),
      total: toDecimal(payload.total),
      currency: payload.currency ?? 'TRY',
      paymentMethod: payload.paymentMethod ?? undefined,
      rawPayload: payload.rawPayload ?? undefined,
    },
    update: {
      status: mapToOrderStatus(payload.status),
      customerEmail: payload.customerEmail ?? undefined,
      customerPhone: payload.customerPhone ?? undefined,
      customerName: payload.customerName ?? undefined,
      shippingAddress: payload.shippingAddress as object,
      billingAddress: (payload.billingAddress ?? undefined) as object | undefined,
      subtotal: toDecimal(payload.subtotal),
      taxTotal: toDecimal(payload.taxTotal),
      shippingCost: toDecimal(payload.shippingCost ?? 0),
      discountTotal: toDecimal(payload.discountTotal ?? 0),
      total: toDecimal(payload.total),
      rawPayload: payload.rawPayload ?? undefined,
    },
    select: { id: true },
  });

  const existingItems = await prisma.orderItem.findMany({
    where: { orderId: order.id },
    select: { id: true },
  });
  if (existingItems.length > 0) {
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  }

  for (const item of payload.items) {
    const productId = await ensureProductForOrderItem(
      storeId,
      item.sku,
      item.name,
      item.unitPrice
    );
    const taxRate = item.taxRate ?? 18;
    const taxAmount = Math.round((item.total * (taxRate / (100 + taxRate))) * 100) / 100;

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: toDecimal(item.unitPrice),
        taxRate: toDecimal(taxRate),
        taxAmount: toDecimal(taxAmount),
        total: toDecimal(item.total),
        rawPayload: item.rawPayload ?? undefined,
      },
    });
  }

  return { upserted: true, orderId: order.id };
}

/**
 * Trendyol'dan siparişleri çeker ve veritabanına upsert eder.
 */
export async function syncTrendyolOrders(
  storeId: string,
  options: SyncTrendyolOrdersOptions = {}
): Promise<SyncTrendyolOrdersResult> {
  const errors: string[] = [];
  let ordersFetched = 0;
  let ordersUpserted = 0;
  let ordersFailed = 0;

  const connectionRow = options.connectionId
    ? await prisma.marketplaceConnection.findFirst({
        where: { id: options.connectionId, storeId, platform: 'TRENDYOL', isActive: true },
      })
    : await prisma.marketplaceConnection.findFirst({
        where: { storeId, platform: 'TRENDYOL', isActive: true },
      });

  if (!connectionRow) {
    throw new Error(
      options.connectionId
        ? 'Belirtilen Trendyol bağlantısı bulunamadı veya pasif.'
        : 'Mağaza için aktif Trendyol bağlantısı yok.'
    );
  }

  const decrypted = await getConnectionWithDecryptedCredentials(connectionRow.id);
  if (!decrypted?.apiKey || !decrypted?.apiSecret) {
    throw new Error('Trendyol bağlantısında API Key veya Secret eksik.');
  }

  const connection = toAdapterConnection(decrypted);
  const adapter = getMarketplaceAdapter('TRENDYOL') as {
    fetchOrders: (
      conn: typeof connection,
      params?: {
        startDate?: number;
        endDate?: number;
        status?: string;
        page?: number;
        size?: number;
        orderByField?: string;
        orderByDirection?: string;
      }
    ) => Promise<NormalizedOrderPayload[]>;
  };

  const now = Date.now();
  const lastDays = options.lastDays ?? 7;
  const startDate = options.startDate ?? now - lastDays * 24 * 60 * 60 * 1000;
  const endDate = options.endDate ?? now;
  const pageSize = Math.min(options.pageSize ?? 50, 200);
  let page = 0;

  for (;;) {
    const orders = await adapter.fetchOrders(connection, {
      startDate,
      endDate,
      status: options.status,
      page,
      size: pageSize,
      orderByField: 'PackageLastModifiedDate',
      orderByDirection: 'DESC',
    });

    ordersFetched += orders.length;

    for (const payload of orders) {
      try {
        await upsertOrderFromPayload(storeId, connectionRow.id, payload);
        ordersUpserted++;
      } catch (err) {
        ordersFailed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Order ${payload.marketplaceOrderId}: ${msg}`);
      }
    }

    if (orders.length < pageSize) break;
    page++;
  }

  await prisma.marketplaceConnection.update({
    where: { id: connectionRow.id },
    data: { lastSyncAt: new Date() },
  }).catch(() => {});

  return {
    storeId,
    connectionId: connectionRow.id,
    ordersFetched,
    ordersUpserted,
    ordersFailed,
    errors: errors.slice(0, 50),
  };
}
