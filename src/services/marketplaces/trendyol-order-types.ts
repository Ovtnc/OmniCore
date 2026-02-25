/**
 * Trendyol getShipmentPackages API yanıt tipleri ve OmniCore Order/OrderItem normalizasyonu.
 * Ref: https://developers.trendyol.com/v2.0/docs/get-order-packages-getshipmentpackages
 */

import type { NormalizedOrderPayload } from './types';

/** Trendyol adres objesi */
export interface TrendyolAddress {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  company?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  district?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  phone?: string | null;
  fullAddress?: string | null;
  taxOffice?: string | null;
  taxNumber?: string | null;
}

/** Trendyol sipariş satırı (lines[]) */
export interface TrendyolOrderLine {
  id?: number;
  lineId?: number;
  quantity?: number;
  merchantSku?: string;
  stockCode?: string;
  sku?: string;
  productName?: string;
  productCode?: number;
  contentId?: number;
  price?: number;
  lineUnitPrice?: number;
  amount?: number;
  lineGrossAmount?: number;
  vatRate?: number;
  currencyCode?: string;
  barcode?: string;
}

/** Trendyol sipariş paketi (content[] elemanı) */
export interface TrendyolShipmentPackage {
  id?: number;
  shipmentPackageId?: number;
  orderNumber?: string;
  status?: string;
  shipmentPackageStatus?: string;
  orderDate?: number;
  totalPrice?: number;
  packageTotalPrice?: number;
  grossAmount?: number;
  packageGrossAmount?: number;
  totalDiscount?: number;
  packageTotalDiscount?: number;
  packageSellerDiscount?: number;
  packageTyDiscount?: number;
  totalTyDiscount?: number;
  currencyCode?: string;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerEmail?: string | null;
  customerId?: number;
  shipmentAddress?: TrendyolAddress | null;
  invoiceAddress?: TrendyolAddress | null;
  cargoTrackingNumber?: string | null;
  cargoProviderName?: string | null;
  lines?: TrendyolOrderLine[] | null;
  commercial?: boolean;
  [key: string]: unknown;
}

/** API sayfalı yanıt */
export interface TrendyolOrdersResponse {
  content?: TrendyolShipmentPackage[];
  totalElements?: number;
  totalPages?: number;
  page?: number;
  size?: number;
}

const TRENDYOL_TO_ORDER_STATUS: Record<string, 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'> = {
  Awaiting: 'PENDING',
  Created: 'CONFIRMED',
  Picking: 'PROCESSING',
  Invoiced: 'PROCESSING',
  Shipped: 'SHIPPED',
  Delivered: 'DELIVERED',
  AtCollectionPoint: 'SHIPPED',
  Cancelled: 'CANCELLED',
  UnSupplied: 'CANCELLED',
  UnPacked: 'PROCESSING',
  UnDelivered: 'REFUNDED',
  Returned: 'REFUNDED',
  Repack: 'PROCESSING',
};

function mapTrendyolStatus(trendyolStatus: string | undefined): 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' {
  const s = (trendyolStatus ?? '').trim();
  return (TRENDYOL_TO_ORDER_STATUS[s] ?? 'PENDING') as 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
}

function toShippingAddress(addr: TrendyolAddress | null | undefined): Record<string, unknown> {
  if (!addr || typeof addr !== 'object') return { _source: 'trendyol', raw: null };
  return {
    firstName: addr.firstName ?? null,
    lastName: addr.lastName ?? null,
    fullName: addr.fullName ?? null,
    company: addr.company ?? null,
    address1: addr.address1 ?? null,
    address2: addr.address2 ?? null,
    city: addr.city ?? null,
    district: addr.district ?? null,
    postalCode: addr.postalCode ?? null,
    countryCode: addr.countryCode ?? null,
    phone: addr.phone ?? null,
    fullAddress: addr.fullAddress ?? null,
  };
}

/**
 * Tek bir Trendyol sipariş paketini OmniCore NormalizedOrderPayload formatına çevirir.
 */
export function normalizeTrendyolPackageToOrderPayload(
  pkg: TrendyolShipmentPackage
): NormalizedOrderPayload {
  const status = pkg.shipmentPackageStatus ?? pkg.status ?? 'Created';
  const orderId = pkg.shipmentPackageId ?? pkg.id;
  const orderNumber = pkg.orderNumber ?? (orderId != null ? String(orderId) : '');
  const total = Number(pkg.packageTotalPrice ?? pkg.totalPrice ?? pkg.packageGrossAmount ?? pkg.grossAmount ?? 0);
  const discount = Number(pkg.packageTotalDiscount ?? pkg.totalDiscount ?? 0);
  const subtotal = total + discount;
  const lines = Array.isArray(pkg.lines) ? pkg.lines : [];

  const customerName = [pkg.customerFirstName, pkg.customerLastName].filter(Boolean).join(' ').trim() || null;

  return {
    marketplaceOrderId: orderId != null ? String(orderId) : `ty-${orderNumber}-${Date.now()}`,
    orderNumber: orderNumber || undefined,
    status: mapTrendyolStatus(status),
    customerEmail: pkg.customerEmail ?? null,
    customerPhone: pkg.shipmentAddress?.phone ?? null,
    customerName: customerName ?? null,
    shippingAddress: toShippingAddress(pkg.shipmentAddress),
    billingAddress: pkg.invoiceAddress ? toShippingAddress(pkg.invoiceAddress) : null,
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: 0,
    shippingCost: 0,
    discountTotal: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency: pkg.currencyCode ?? 'TRY',
    paymentMethod: null,
    items: lines.map((line) => {
      const qty = Number(line.quantity ?? 1);
      const unitPrice = Number(line.lineUnitPrice ?? line.price ?? line.amount ?? 0);
      const lineTotal = Number(line.lineGrossAmount ?? line.amount ?? unitPrice * qty);
      const vatRate = Number(line.vatRate ?? 18);
      return {
        sku: line.stockCode ?? line.merchantSku ?? line.sku ?? '',
        name: line.productName ?? '',
        quantity: qty,
        unitPrice: Math.round(unitPrice * 100) / 100,
        taxRate: vatRate,
        total: Math.round(lineTotal * 100) / 100,
        rawPayload: { lineId: line.lineId ?? line.id, contentId: line.contentId ?? line.productCode },
      };
    }).filter((i) => i.sku || i.name),
    rawPayload: pkg as unknown as Record<string, unknown>,
  };
}
