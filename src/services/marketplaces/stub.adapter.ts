/**
 * Henüz tam implemente edilmemiş platformlar için stub adapter.
 * Tüm metodlar anlamlı hata veya boş cevap döner; ileride gerçek API bağlanabilir.
 */

import { MarketplaceAdapter } from './base.adapter';
import type { MarketplaceConnection, MarketplaceProduct } from './base.adapter';
import type { NormalizedOrderPayload } from './types';

export class StubMarketplaceAdapter extends MarketplaceAdapter {
  constructor(public readonly platform: string) {
    super();
  }

  async sendProduct(_product: MarketplaceProduct, connection: MarketplaceConnection): Promise<unknown> {
    if (!connection.apiKey) {
      throw new Error(`${this.platform}: apiKey gerekli`);
    }
    return { success: false, message: `${this.platform} sendProduct henüz implemente edilmedi` };
  }

  async fetchOrders(_connection: MarketplaceConnection): Promise<NormalizedOrderPayload[]> {
    return [];
  }

  async updateStock(
    _sku: string,
    _quantity: number,
    connection: MarketplaceConnection
  ): Promise<unknown> {
    if (!connection.apiKey) throw new Error(`${this.platform}: apiKey gerekli`);
    return { success: false, message: `${this.platform} updateStock henüz implemente edilmedi` };
  }

  async updatePrice(
    _sku: string,
    _salePrice: number,
    _listPrice: number,
    connection: MarketplaceConnection
  ): Promise<unknown> {
    if (!connection.apiKey) throw new Error(`${this.platform}: apiKey gerekli`);
    return { success: false, message: `${this.platform} updatePrice henüz implemente edilmedi` };
  }
}
