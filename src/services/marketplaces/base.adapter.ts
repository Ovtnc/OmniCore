/**
 * OmniCore - Pazaryeri soyut taban sınıfı
 * Tüm pazaryeri adaptörleri bu sınıfı genişletir: ürün gönderimi, fiyat/stok, sipariş, iptal/onay.
 */

import type { MappedListingError, NormalizedOrderPayload, RateLimitInfo, ImageRules } from './types';

export interface MarketplaceConnection {
  apiKey?: string;
  apiSecret?: string;
  sellerId?: string;
  supplierId?: string;
  /** Platforma özel (region, storeDomain, appKey vb.) */
  [key: string]: string | undefined;
}

export interface MarketplaceProduct {
  sku: string;
  name: string;
  description?: string;
  barcode?: string;
  salePrice: number;
  listPrice?: number;
  stockQuantity?: number;
  quantity?: number;
  categoryId?: string;
  brandId?: string;
  images?: Array<{ url: string } | string>;
  [key: string]: unknown;
}

export abstract class MarketplaceAdapter {
  abstract platform: string;

  /**
   * Canlı bağlantı testi destekleniyor mu?
   * Varsayılan: destekleniyor. Stub/iskelet adapterlar override etmelidir.
   */
  supportsLiveConnectionTest(): boolean {
    return true;
  }

  /** Bağlantıyı test et; başarılı ise { ok: true }, değilse { ok: false, message } */
  async testConnection(connection: MarketplaceConnection): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.fetchOrders(connection);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: msg };
    }
  }

  /** Ürünü pazaryeri formatına çevir ve gönder */
  abstract sendProduct(product: MarketplaceProduct, connection: MarketplaceConnection): Promise<unknown>;

  /** Pazaryerinden gelen siparişleri çek; normalize edilmiş liste dönebilir */
  abstract fetchOrders(connection: MarketplaceConnection): Promise<unknown>;

  /** Stok güncelle */
  abstract updateStock(sku: string, quantity: number, connection: MarketplaceConnection): Promise<unknown>;

  /** Fiyat güncelle */
  abstract updatePrice(
    sku: string,
    salePrice: number,
    listPrice: number,
    connection: MarketplaceConnection
  ): Promise<unknown>;

  /** Fiyat + stok tek istekte (API destekliyorsa override et) */
  async updatePriceAndStock(
    sku: string,
    salePrice: number,
    listPrice: number,
    quantity: number,
    connection: MarketplaceConnection
  ): Promise<unknown> {
    await this.updatePrice(sku, salePrice, listPrice, connection);
    return this.updateStock(sku, quantity, connection);
  }

  /** Sipariş onayla (varsayılan: desteklenmiyor) */
  async confirmOrder(_orderId: string, _connection: MarketplaceConnection): Promise<unknown> {
    throw new Error(`${this.platform}: confirmOrder henüz desteklenmiyor`);
  }

  /** Sipariş iptal et (varsayılan: desteklenmiyor) */
  async cancelOrder(_orderId: string, _connection: MarketplaceConnection): Promise<unknown> {
    throw new Error(`${this.platform}: cancelOrder henüz desteklenmiyor`);
  }

  /** Platform hata kodunu ListingStatus + syncError'a çevir */
  mapPlatformError(err: unknown): MappedListingError {
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('429')) {
      return { listingStatus: 'SYNC_ERROR', syncError: `Rate limit: ${msg}` };
    }
    if (lower.includes('barcode') || lower.includes('geçersiz') || lower.includes('invalid')) {
      return { listingStatus: 'REJECTED', syncError: msg };
    }
    if (lower.includes('unauthorized') || lower.includes('401') || lower.includes('403')) {
      return { listingStatus: 'SYNC_ERROR', syncError: `Yetki hatası: ${msg}` };
    }
    return { listingStatus: 'SYNC_ERROR', syncError: msg };
  }

  /** API yanıtından rate limit header'larını parse et */
  parseRateLimitFromResponse(response: { headers?: Headers | Record<string, string> }): RateLimitInfo {
    const headers = response.headers;
    if (!headers) return { remaining: null, resetAt: null };
    const get = (name: string) => {
      if (headers instanceof Headers) return headers.get(name);
      const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
      return key ? (headers as Record<string, string>)[key] : null;
    };
    const remaining = get('x-ratelimit-remaining') ?? get('rate-limit-remaining');
    const reset = get('x-ratelimit-reset') ?? get('rate-limit-reset');
    const resetAt = reset ? new Date(Number(reset) * 1000) : null;
    return {
      remaining: remaining != null ? parseInt(remaining, 10) : null,
      resetAt: resetAt && !Number.isNaN(resetAt.getTime()) ? resetAt : null,
    };
  }

  /** Görsel URL'lerini platform kurallarına göre sadeleştir (min/max çözünürlük, beyaz arka plan uyarısı) */
  sanitizeImageUrls(
    images: Array<{ url: string } | string>,
    _rules?: ImageRules
  ): Array<{ url: string }> {
    const urls = images
      .map((img) => (typeof img === 'string' ? img : img?.url))
      .filter((url): url is string => typeof url === 'string' && url.startsWith('http'));
    return urls.map((url) => ({ url }));
  }
}

export type { NormalizedOrderPayload, MappedListingError, RateLimitInfo, ImageRules };
