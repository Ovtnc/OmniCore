/**
 * Trendyol API Adapter
 * https://developers.trendyol.com/
 */

import { MarketplaceIntegrationBase } from '../../base/MarketplaceIntegrationBase';
import type {
  MarketplaceProductPayload,
  MarketplaceOrderPayload,
  SyncProductResult,
  SyncOrderResult,
  SyncStockResult,
} from '../../types';
import { MarketplacePlatform } from '@prisma/client';

export class TrendyolAdapter extends MarketplaceIntegrationBase {
  readonly platform = MarketplacePlatform.TRENDYOL;

  protected mapProductToPlatformFormat(
    payload: MarketplaceProductPayload
  ): Record<string, unknown> {
    return {
      barcode: payload.barcode ?? payload.sku,
      title: payload.name,
      productMainId: payload.sku,
      quantity: payload.quantity,
      stockCode: payload.sku,
      dimensionalWeight: payload.weight ?? 0,
      description: payload.description ?? '',
      categoryId: payload.categoryId,
      listPrice: payload.listPrice,
      salePrice: payload.salePrice,
      images: (payload.images || []).map((url) => ({ url })),
      attributes: payload.attributes
        ? Object.entries(payload.attributes).map(([key, value]) => ({
            attributeName: key,
            attributeValue: value,
          }))
        : [],
      brand: payload.brand ? { name: payload.brand } : undefined,
    };
  }

  async syncProduct(
    payload: MarketplaceProductPayload,
    externalId?: string
  ): Promise<SyncProductResult> {
    await this.ensureRateLimit();
    try {
      const body = this.mapProductToPlatformFormat(payload);
      const supplierId = this.credentials.supplierId;
      if (!supplierId || !this.credentials.apiKey) {
        return { success: false, error: 'Trendyol supplierId ve apiKey gerekli' };
      }
      // TODO: Gerçek API çağrısı - products PATCH/POST
      return {
        success: true,
        externalId: externalId ?? `ty-${Date.now()}`,
        externalSku: payload.sku,
        rawResponse: { body, supplierId },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Trendyol sync error',
      };
    }
  }

  async syncStock(
    items: Array<{ sku: string; quantity: number; externalId?: string }>
  ): Promise<SyncStockResult> {
    await this.ensureRateLimit();
    try {
      // TODO: Trendyol batch stock update API
      return { success: true, updatedCount: items.length };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Trendyol stock sync error',
      };
    }
  }

  async fetchOrders(): Promise<MarketplaceOrderPayload[]> {
    await this.ensureRateLimit();
    // TODO: Trendyol orders API
    return [];
  }

  async updateOrderStatus(): Promise<SyncOrderResult> {
    await this.ensureRateLimit();
    return { success: true };
  }

  async healthCheck(): Promise<boolean> {
    await this.ensureRateLimit();
    // TODO: Trendyol auth/test endpoint
    return true;
  }
}
