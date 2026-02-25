/**
 * Pazaryeri adapter'ları için ortak tipler.
 * Order modelimize map edilebilir payload.
 */

export type ListingStatusType = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SYNC_ERROR';

/** Platform hata kodunu bizim ListingStatus + syncError'a çevirir */
export interface MappedListingError {
  listingStatus: ListingStatusType;
  syncError: string;
}

/** Adapter'ın fetchOrders ile döndüreceği sipariş; Order create/update için kullanılır */
export interface NormalizedOrderPayload {
  marketplaceOrderId: string;
  orderNumber?: string;
  status: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  shippingAddress: Record<string, unknown>;
  billingAddress?: Record<string, unknown> | null;
  subtotal: number;
  taxTotal: number;
  shippingCost?: number;
  discountTotal?: number;
  total: number;
  currency: string;
  paymentMethod?: string | null;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    total: number;
    rawPayload?: Record<string, unknown>;
  }>;
  rawPayload?: Record<string, unknown>;
}

/** API yanıtından rate limit bilgisi */
export interface RateLimitInfo {
  remaining: number | null;
  resetAt: Date | null;
}

/** Görsel kuralları (platforma göre) */
export interface ImageRules {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  whiteBackgroundRequired?: boolean;
  maxUrls?: number;
}
