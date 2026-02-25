/**
 * OmniCore - Abstract Marketplace Integration Manager
 * Tüm pazaryeri adaptörleri bu sınıfı genişletir.
 * Rate limit ve retry mantığı burada merkezi yönetilir.
 */

import type {
  IntegrationCredentials,
  RateLimitState,
  MarketplaceProductPayload,
  MarketplaceOrderPayload,
  SyncProductResult,
  SyncOrderResult,
  SyncStockResult,
} from '../types';
import type { MarketplacePlatform } from '@prisma/client';

const DEFAULT_RATE_LIMIT_PER_MINUTE = 60;

export abstract class MarketplaceIntegrationBase {
  abstract readonly platform: MarketplacePlatform;
  protected credentials: IntegrationCredentials;
  protected rateLimit: RateLimitState;
  protected storeId: string;

  constructor(
    storeId: string,
    credentials: IntegrationCredentials,
    rateLimit?: Partial<RateLimitState>
  ) {
    this.storeId = storeId;
    this.credentials = credentials;
    this.rateLimit = {
      remaining: rateLimit?.remaining ?? DEFAULT_RATE_LIMIT_PER_MINUTE,
      resetAt: rateLimit?.resetAt ?? new Date(Date.now() + 60_000),
      limit: rateLimit?.limit ?? DEFAULT_RATE_LIMIT_PER_MINUTE,
    };
  }

  /** API çağrısı öncesi rate limit kontrolü; aşılıyorsa bekler */
  protected async ensureRateLimit(): Promise<void> {
    const now = new Date();
    if (this.rateLimit.remaining <= 0 && this.rateLimit.resetAt > now) {
      const waitMs = this.rateLimit.resetAt.getTime() - now.getTime();
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 60_000)));
      this.rateLimit.remaining = this.rateLimit.limit;
      this.rateLimit.resetAt = new Date(Date.now() + 60_000);
    }
    if (this.rateLimit.remaining <= 0) {
      this.rateLimit.remaining = this.rateLimit.limit;
      this.rateLimit.resetAt = new Date(Date.now() + 60_000);
    }
    this.rateLimit.remaining--;
  }

  /** Platforma özel product → dış format dönüşümü */
  protected abstract mapProductToPlatformFormat(
    payload: MarketplaceProductPayload
  ): Record<string, unknown>;

  /** Ürün gönder / güncelle */
  abstract syncProduct(
    payload: MarketplaceProductPayload,
    externalId?: string
  ): Promise<SyncProductResult>;

  /** Stok güncelle (toplu) */
  abstract syncStock(
    items: Array<{ sku: string; quantity: number; externalId?: string }>
  ): Promise<SyncStockResult>;

  /** Sipariş çek (platformdan) */
  abstract fetchOrders(params: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    limit?: number;
  }): Promise<MarketplaceOrderPayload[]>;

  /** Sipariş durumu güncelle (kargo bilgisi vb.) */
  abstract updateOrderStatus(
    marketplaceOrderId: string,
    status: string,
    tracking?: { number: string; provider?: string }
  ): Promise<SyncOrderResult>;

  /** Mevcut rate limit bilgisini döndür (DB güncellemesi için) */
  getRateLimitState(): RateLimitState {
    return { ...this.rateLimit };
  }

  /** Bağlantı testi */
  abstract healthCheck(): Promise<boolean>;
}
