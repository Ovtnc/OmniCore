/**
 * Trendyol API Adapter
 * https://developers.trendyol.com/
 * Referans: Sipariş getShipmentPackages, Ürün/Stok endpoint'leri apigw.trendyol.com kullanır.
 *
 * Auth & User-Agent (zorunlu; yoksa 403):
 * - Header: Basic base64(apiKey:apiSecret)
 * - User-Agent: "Satıcı Id - EntegratörAdı" veya "Satıcı Id - SelfIntegration", max 30 karakter.
 *
 * Rate limit: Aynı endpoint'e 10 saniyede en fazla 50 istek; aşımda 429 (too.many.requests).
 */

import { MarketplaceAdapter } from './base.adapter';
import type { MarketplaceConnection, MarketplaceProduct } from './base.adapter';

const TRENDYOL_BASE = 'https://apigw.trendyol.com';

export class TrendyolAdapter extends MarketplaceAdapter {
  platform = 'TRENDYOL';

  private getAuthHeader(connection: MarketplaceConnection): string {
    const key = connection.apiKey ?? '';
    const secret = connection.apiSecret ?? '';
    const encoded = Buffer.from(`${key}:${secret}`).toString('base64');
    return `Basic ${encoded}`;
  }

  /**
   * User-Agent zorunlu (döküman: "Satıcı Id - {Entegrasyon Firması İsmi}" veya "Satıcı Id - SelfIntegration").
   * Bağlantıda extraConfig.integratorName varsa onu kullanır; "Self" veya boş ise "SelfIntegration", yoksa "OmniCore".
   */
  private getUserAgent(connection: MarketplaceConnection): string {
    const sellerId = String(connection.sellerId ?? connection.supplierId ?? '').trim();
    const rawName = connection.integratorName?.trim() ?? '';
    const name =
      rawName === '' || rawName.toLowerCase() === 'self' ? 'SelfIntegration' : rawName || 'OmniCore';
    const ua = `${sellerId} - ${name}`.replace(/[^a-zA-Z0-9 -]/g, '').slice(0, 30);
    return ua || `${sellerId} - SelfIntegration`.slice(0, 30);
  }

  /**
   * Ürünün Trendyol'da kayıtlı olup olmadığını barkod ile kontrol eder.
   * GET /integration/product/sellers/{sellerId}/products?barcode=...&size=1
   */
  private async getProductsByBarcode(
    connection: MarketplaceConnection,
    barcode: string
  ): Promise<unknown[]> {
    const sellerId = connection.sellerId ?? connection.supplierId;
    if (!sellerId || !connection.apiKey || !connection.apiSecret) return [];
    const url = `${TRENDYOL_BASE}/integration/product/sellers/${sellerId}/products?barcode=${encodeURIComponent(barcode)}&size=1`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: this.getAuthHeader(connection),
          'User-Agent': this.getUserAgent(connection),
        },
      });
      const data = (await res.json().catch(() => ({}))) as { content?: unknown[]; totalElements?: number };
      if (Array.isArray(data.content) && data.content.length > 0) return data.content;
      if (Number(data.totalElements) > 0) return [{}];
      return [];
    } catch {
      return [];
    }
  }

  async sendProduct(product: MarketplaceProduct, connection: MarketplaceConnection): Promise<unknown> {
    const sellerId = connection.sellerId ?? connection.supplierId;
    if (!sellerId || !connection.apiKey || !connection.apiSecret) {
      const msg = 'Trendyol: apiKey, apiSecret ve sellerId/supplierId gerekli';
      console.error('[TrendyolAdapter.sendProduct] Eksik bilgi', {
        hasSellerId: !!sellerId,
        sellerIdValue: sellerId ?? '(yok)',
        hasApiKey: !!connection.apiKey,
        hasApiSecret: !!connection.apiSecret,
      });
      throw new Error(msg);
    }

    const barcode = (product.barcode ?? product.sku) as string;
    const brandId = Number(product.brandId ?? 0);
    const categoryId = Number(product.categoryId ?? 0);

    // Ürün Trendyol'da zaten varsa "tekrarlı ürün oluşturma" hatası alınır; sadece fiyat/stok güncelle.
    const existing = await this.getProductsByBarcode(connection, barcode);
    if (existing.length > 0) {
      const salePrice = Number(product.salePrice ?? 0);
      const listPrice = Number(product.listPrice ?? product.salePrice ?? 0);
      const quantity = Number(product.stockQuantity ?? product.quantity ?? 0);
      console.log('[TrendyolAdapter.sendProduct] Ürün zaten mevcut, fiyat/stok güncelleniyor', {
        barcode,
        productMainId: product.sku,
      });
      return this.updatePriceAndStock(barcode, salePrice, listPrice, quantity, connection);
    }

    if (brandId === 0 || categoryId === 0) {
      const msg =
        'Trendyol: Marka ID ve Kategori ID zorunludur (0 olamaz). Ürünü düzenleyip Trendyol Marka ID ve Kategori ID alanlarını doldurun veya ürünün birincil kategorisinin External ID değerini Trendyol kategori ID olarak ayarlayın.';
      console.error('[TrendyolAdapter.sendProduct] Geçersiz brandId/categoryId', {
        sku: product.sku,
        brandId,
        categoryId,
      });
      throw new Error(msg);
    }

    // Ref: https://developers.trendyol.com/docs/ürün-yaratma-v2 → POST .../v2/products
    const endpoint = `${TRENDYOL_BASE}/integration/product/sellers/${sellerId}/v2/products`;
    const images = (product.images ?? []).map((img: { url?: string } | string) =>
      typeof img === 'string' ? { url: img } : { url: (img as { url: string }).url }
    );

    const payload = {
      items: [
        {
          barcode,
          title: product.name,
          productMainId: product.sku,
          brandId,
          categoryId,
          quantity: product.stockQuantity ?? product.quantity ?? 0,
          stockCode: product.sku,
          dimensionalWeight: 1,
          listPrice: product.listPrice ?? product.salePrice,
          salePrice: product.salePrice,
          vatRate: 10,
          description: product.description ?? '',
          images,
          attributes: [],
        },
      ],
    };

    const userAgent = this.getUserAgent(connection);
    // Kapsamlı log: curl ile karşılaştırmak için (secret sadece uzunluk)
    console.log('[TrendyolAdapter.sendProduct] İstek özeti', {
      endpoint,
      sellerId,
      sellerIdType: typeof sellerId,
      userAgent,
      userAgentLength: userAgent.length,
      authHeaderPrefix: `Basic ${(connection.apiKey?.slice(0, 4) ?? '')}... (len=${connection.apiKey?.length ?? 0})`,
      payloadItemCount: payload.items.length,
        firstItem: {
        barcode: payload.items[0].barcode,
        title: payload.items[0].title?.slice(0, 40),
        brandId: payload.items[0].brandId,
        categoryId: payload.items[0].categoryId,
        salePrice: payload.items[0].salePrice,
        listPrice: payload.items[0].listPrice,
      },
    });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(connection),
        'User-Agent': userAgent,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errors = Array.isArray((data as { errors?: unknown }).errors) ? (data as { errors: unknown[] }).errors : [];
      const isRecurringCreate = errors.some(
        (e: unknown) => (e as { key?: string })?.key === 'batchRequest.recurring.product.create.not.allowed'
      );
      if (res.status === 400 && isRecurringCreate) {
        const salePrice = Number(product.salePrice ?? 0);
        const listPrice = Number(product.listPrice ?? product.salePrice ?? 0);
        const quantity = Number(product.stockQuantity ?? product.quantity ?? 0);
        console.log('[TrendyolAdapter.sendProduct] Tekrarlı ürün hatası → fiyat/stok güncelleniyor', {
          barcode,
          productMainId: product.sku,
        });
        return this.updatePriceAndStock(barcode, salePrice, listPrice, quantity, connection);
      }
      console.error('[TrendyolAdapter.sendProduct] API hata yanıtı', {
        status: res.status,
        statusText: res.statusText,
        body: data,
        endpoint,
        userAgent,
      });
      throw new Error(
        (data as { message?: string })?.message ??
          (errors.length ? JSON.stringify(errors) : null) ??
          `Trendyol API ${res.status}: ${res.statusText}`
      );
    }
    console.log('[TrendyolAdapter.sendProduct] Başarılı', { batchRequestId: (data as { batchRequestId?: string })?.batchRequestId });
    return data;
  }

  /**
   * Trendyol marka listesi (getBrands). Ürün oluştururken brandId almak için.
   * GET /integration/product/brands?page=0&size=1000
   */
  async getBrands(connection: MarketplaceConnection): Promise<{ id: number; name: string }[]> {
    if (!connection.apiKey || !connection.apiSecret) {
      throw new Error('Trendyol: apiKey, apiSecret gerekli');
    }
    const all: { id: number; name: string }[] = [];
    let page = 0;
    const size = 1000;
    for (;;) {
      const url = `${TRENDYOL_BASE}/integration/product/brands?page=${page}&size=${size}`;
      const res = await fetch(url, {
        headers: {
          Authorization: this.getAuthHeader(connection),
          'User-Agent': this.getUserAgent(connection),
        },
      });
      const data = (await res.json().catch(() => ({}))) as { brands?: { id: number; name: string }[] };
      if (!res.ok) {
        throw new Error(
          (data as { message?: string })?.message ?? `Trendyol brands ${res.status}: ${res.statusText}`
        );
      }
      const brands = data.brands ?? [];
      if (brands.length === 0) break;
      all.push(...brands);
      if (brands.length < size) break;
      page++;
    }
    return all;
  }

  /**
   * Trendyol kategori ağacı (getCategoryTree). Yaprak kategoriler ürün oluşturmada kullanılır.
   * GET /integration/product/product-categories
   */
  async getCategoryTree(connection: MarketplaceConnection): Promise<
    { id: number; name: string; parentId?: number; subCategories: unknown[] }[]
  > {
    if (!connection.apiKey || !connection.apiSecret) {
      throw new Error('Trendyol: apiKey, apiSecret gerekli');
    }
    const url = `${TRENDYOL_BASE}/integration/product/product-categories`;
    const res = await fetch(url, {
      headers: {
        Authorization: this.getAuthHeader(connection),
        'User-Agent': this.getUserAgent(connection),
      },
    });
    const data = (await res.json().catch(() => ({}))) as {
      categories?: { id: number; name: string; parentId?: number; subCategories: unknown[] }[];
    };
    if (!res.ok) {
      throw new Error(
        (data as { message?: string })?.message ?? `Trendyol categories ${res.status}: ${res.statusText}`
      );
    }
    return data.categories ?? [];
  }

  /**
   * Sipariş paketlerini çeker (getShipmentPackages).
   * Ref: https://developers.trendyol.com/reference/getshipmentpackages
   * GET /integration/order/sellers/{sellerId}/orders
   */
  async fetchOrders(connection: MarketplaceConnection): Promise<unknown> {
    const sellerId = connection.sellerId ?? connection.supplierId;
    if (!sellerId || !connection.apiKey || !connection.apiSecret) {
      throw new Error('Trendyol: apiKey, apiSecret ve sellerId gerekli');
    }
    const endpoint = `${TRENDYOL_BASE}/integration/order/sellers/${sellerId}/orders`;
    const res = await fetch(endpoint, {
      headers: {
        Authorization: this.getAuthHeader(connection),
        'User-Agent': this.getUserAgent(connection),
      },
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
    const endpoint = `${TRENDYOL_BASE}/integration/inventory/sellers/${sellerId}/products/price-and-inventory`;
    const payload = {
      items: [{ barcode: sku, quantity }],
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(connection),
        'User-Agent': this.getUserAgent(connection),
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
    const endpoint = `${TRENDYOL_BASE}/integration/inventory/sellers/${sellerId}/products/price-and-inventory`;
    const payload = {
      items: [{ barcode: sku, salePrice, listPrice }],
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(connection),
        'User-Agent': this.getUserAgent(connection),
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
    const endpoint = `${TRENDYOL_BASE}/integration/inventory/sellers/${sellerId}/products/price-and-inventory`;
    const payload = {
      items: [{ barcode: sku, salePrice, listPrice, quantity }],
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(connection),
        'User-Agent': this.getUserAgent(connection),
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
