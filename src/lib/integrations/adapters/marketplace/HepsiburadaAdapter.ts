/**
 * Hepsiburada API Adapter
 * https://mpop-sit.hepsiburada.com/product-api/api/v1
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

export class HepsiburadaAdapter extends MarketplaceIntegrationBase {
  readonly platform = MarketplacePlatform.HEPSIBURADA;

  protected mapProductToPlatformFormat(
    payload: MarketplaceProductPayload
  ): Record<string, unknown> {
    return {
      merchantSku: payload.sku,
      productName: payload.name,
      description: payload.description ?? '',
      barcode: payload.barcode ?? payload.sku,
      quantity: payload.quantity,
      listingPrice: payload.listPrice,
      salePrice: payload.salePrice,
      images: payload.images,
      categoryId: payload.categoryId,
      attributes: payload.attributes,
      brand: payload.brand,
    };
  }

  async syncProduct(
    payload: MarketplaceProductPayload,
    externalId?: string
  ): Promise<SyncProductResult> {
    await this.ensureRateLimit();
    try {
      const body = this.mapProductToPlatformFormat(payload);
      // TODO: Hepsiburada products API
      return {
        success: true,
        externalId: externalId ?? `hb-${Date.now()}`,
        externalSku: payload.sku,
        rawResponse: { body },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Hepsiburada sync error',
      };
    }
  }

  async syncStock(
    items: Array<{ sku: string; quantity: number; externalId?: string }>
  ): Promise<SyncStockResult> {
    await this.ensureRateLimit();
    return { success: true, updatedCount: items.length };
  }

  async fetchOrders(): Promise<MarketplaceOrderPayload[]> {
    await this.ensureRateLimit();
    return [];
  }

  async updateOrderStatus(): Promise<SyncOrderResult> {
    await this.ensureRateLimit();
    return { success: true };
  }

  async healthCheck(): Promise<boolean> {
    await this.ensureRateLimit();
    return true;
  }
}
