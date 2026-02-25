/**
 * Hepsiburada API Adapter (iskelet – sonra genişletilecek)
 * https://mpop-sit.hepsiburada.com/product-api/api/v1
 */

import { MarketplaceAdapter } from './base.adapter';
import type { MarketplaceConnection, MarketplaceProduct } from './base.adapter';

export class HepsiburadaAdapter extends MarketplaceAdapter {
  platform = 'HEPSIBURADA';

  async sendProduct(_product: MarketplaceProduct, connection: MarketplaceConnection): Promise<unknown> {
    if (!connection.apiKey || !connection.apiSecret) {
      throw new Error('Hepsiburada: apiKey ve apiSecret gerekli');
    }
    // TODO: Hepsiburada ürün gönderim API'si
    return { success: true, message: 'Hepsiburada sendProduct henüz implemente edilmedi' };
  }

  async fetchOrders(connection: MarketplaceConnection): Promise<unknown> {
    if (!connection.apiKey || !connection.apiSecret) {
      throw new Error('Hepsiburada: apiKey ve apiSecret gerekli');
    }
    // TODO: Hepsiburada sipariş listesi API
    return [];
  }

  async updateStock(
    _sku: string,
    _quantity: number,
    connection: MarketplaceConnection
  ): Promise<unknown> {
    if (!connection.apiKey || !connection.apiSecret) {
      throw new Error('Hepsiburada: apiKey ve apiSecret gerekli');
    }
    // TODO: Hepsiburada stok güncelleme API
    return { success: true };
  }

  async updatePrice(
    _sku: string,
    _salePrice: number,
    _listPrice: number,
    connection: MarketplaceConnection
  ): Promise<unknown> {
    if (!connection.apiKey || !connection.apiSecret) {
      throw new Error('Hepsiburada: apiKey ve apiSecret gerekli');
    }
    // TODO: Hepsiburada fiyat güncelleme API
    return { success: true };
  }
}
