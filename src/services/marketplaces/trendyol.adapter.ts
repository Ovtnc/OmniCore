/**
 * Trendyol API Adapter
 * https://developers.trendyol.com/
 */

import { MarketplaceAdapter } from './base.adapter';
import type { MarketplaceConnection, MarketplaceProduct } from './base.adapter';

export class TrendyolAdapter extends MarketplaceAdapter {
  platform = 'TRENDYOL';

  private getAuthHeader(connection: MarketplaceConnection): string {
    const key = connection.apiKey ?? '';
    const secret = connection.apiSecret ?? '';
    const encoded = Buffer.from(`${key}:${secret}`).toString('base64');
    return `Basic ${encoded}`;
  }

  async sendProduct(product: MarketplaceProduct, connection: MarketplaceConnection): Promise<unknown> {
    const sellerId = connection.sellerId ?? connection.supplierId;
    if (!sellerId || !connection.apiKey || !connection.apiSecret) {
      throw new Error('Trendyol: apiKey, apiSecret ve sellerId/supplierId gerekli');
    }

    const endpoint = `https://api.trendyol.com/sapigw/suppliers/${sellerId}/v2/products`;
    const images = (product.images ?? []).map((img: { url?: string } | string) =>
      typeof img === 'string' ? { url: img } : { url: (img as { url: string }).url }
    );

    const payload = {
      items: [
        {
          barcode: (product.barcode ?? product.sku) as string,
          title: product.name,
          productMainId: product.sku,
          brandId: product.brandId ?? 0,
          categoryId: Number(product.categoryId) || 0,
          price: product.salePrice,
          listPrice: product.listPrice ?? product.salePrice,
          stockCode: product.sku,
          quantity: product.stockQuantity ?? product.quantity ?? 0,
          description: product.description ?? '',
          images,
        },
      ],
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(connection),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data as { message?: string })?.message ?? `Trendyol API ${res.status}: ${res.statusText}`
      );
    }
    return data;
  }

  async fetchOrders(connection: MarketplaceConnection): Promise<unknown> {
    const sellerId = connection.sellerId ?? connection.supplierId;
    if (!sellerId || !connection.apiKey || !connection.apiSecret) {
      throw new Error('Trendyol: apiKey, apiSecret ve sellerId gerekli');
    }
    const endpoint = `https://api.trendyol.com/sapigw/suppliers/${sellerId}/orders`;
    const res = await fetch(endpoint, {
      headers: { Authorization: this.getAuthHeader(connection) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data as { message?: string })?.message ?? `Trendyol orders ${res.status}: ${res.statusText}`
      );
    }
    return data;
  }

  async updateStock(
    sku: string,
    quantity: number,
    connection: MarketplaceConnection
  ): Promise<unknown> {
    const sellerId = connection.sellerId ?? connection.supplierId;
    if (!sellerId || !connection.apiKey || !connection.apiSecret) {
      throw new Error('Trendyol: apiKey, apiSecret ve sellerId gerekli');
    }
    const endpoint = `https://api.trendyol.com/sapigw/suppliers/${sellerId}/products/price-and-inventory`;
    const payload = {
      items: [{ barcode: sku, quantity }],
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(connection),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data as { message?: string })?.message ?? `Trendyol stock ${res.status}: ${res.statusText}`
      );
    }
    return data;
  }

  async updatePrice(
    sku: string,
    salePrice: number,
    listPrice: number,
    connection: MarketplaceConnection
  ): Promise<unknown> {
    const sellerId = connection.sellerId ?? connection.supplierId;
    if (!sellerId || !connection.apiKey || !connection.apiSecret) {
      throw new Error('Trendyol: apiKey, apiSecret ve sellerId gerekli');
    }
    const endpoint = `https://api.trendyol.com/sapigw/suppliers/${sellerId}/products/price-and-inventory`;
    const payload = {
      items: [{ barcode: sku, salePrice, listPrice }],
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(connection),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data as { message?: string })?.message ?? `Trendyol price ${res.status}: ${res.statusText}`
      );
    }
    return data;
  }

  async updatePriceAndStock(
    sku: string,
    salePrice: number,
    listPrice: number,
    quantity: number,
    connection: MarketplaceConnection
  ): Promise<unknown> {
    const sellerId = connection.sellerId ?? connection.supplierId;
    if (!sellerId || !connection.apiKey || !connection.apiSecret) {
      throw new Error('Trendyol: apiKey, apiSecret ve sellerId gerekli');
    }
    const endpoint = `https://api.trendyol.com/sapigw/suppliers/${sellerId}/products/price-and-inventory`;
    const payload = {
      items: [{ barcode: sku, salePrice, listPrice, quantity }],
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(connection),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data as { message?: string })?.message ?? `Trendyol price/inventory ${res.status}: ${res.statusText}`
      );
    }
    return data;
  }
}
