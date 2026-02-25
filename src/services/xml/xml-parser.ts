/**
 * OmniCore - Sınırsız XML Import Motoru
 * Tedarikçi/kanal XML'lerini okuyup Product tablosuna yazar.
 * Farklı XML formatları (RSS, Google Merchant, tedarikçi özel) tek akışta desteklenir.
 */

import { XMLParser } from 'fast-xml-parser';
import { prisma } from '@/lib/prisma';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
});

/** XML'den çıkan ham ürün satırı - tedarikçi formatına göre alan adları değişir */
export type XmlRawItem = Record<string, unknown>;

/** Ortak alan eşlemesi: XML tag adı -> Product alanı */
const FIELD_MAP: Record<string, string[]> = {
  sku: ['sku', 'id', 'g:id', 'product_id', 'code', 'barkod'],
  name: ['name', 'title', 'g:title', 'product_name', 'baslik'],
  description: ['description', 'desc', 'g:description', 'aciklama', 'summary'],
  barcode: ['barcode', 'barkod', 'gtin', 'g:gtin'],
  brand: ['brand', 'marka', 'g:brand', 'manufacturer'],
  listPrice: ['listPrice', 'list_price', 'price', 'g:price', 'fiyat', 'msrp'],
  salePrice: ['salePrice', 'sale_price', 'g:sale_price', 'satis_fiyati', 'price'],
  quantity: ['quantity', 'stock', 'g:availability', 'stok', 'qty'],
  image: ['image', 'image_link', 'g:image_link', 'img', 'picture', 'resim'],
  images: ['images', 'g:additional_image_link', 'gallery'],
};

function getFirstMatch(obj: XmlRawItem, keys: string[]): string | number | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null && v !== '') {
      if (typeof v === 'object' && !Array.isArray(v) && key.startsWith('g:')) {
        const nested = (v as Record<string, unknown>)['#text'];
        if (nested != null) return String(nested).trim();
      }
      return typeof v === 'number' ? v : String(v).trim();
    }
  }
  return undefined;
}

function toNum(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Tek bir XML item'ı Product yazılabilir formata çevirir */
function mapXmlItemToProduct(item: XmlRawItem, storeId: string, index: number) {
  const sku =
    (getFirstMatch(item, FIELD_MAP.sku) as string) ||
    `xml-${Date.now()}-${index}`;
  const name = (getFirstMatch(item, FIELD_MAP.name) as string) || 'İsimsiz Ürün';
  const listPrice = toNum(getFirstMatch(item, FIELD_MAP.listPrice));
  const salePriceNum = toNum(getFirstMatch(item, FIELD_MAP.salePrice));
  const salePrice = salePriceNum > 0 ? salePriceNum : listPrice;
  const quantity = toNum(getFirstMatch(item, FIELD_MAP.quantity));
  const rawImage = getFirstMatch(item, FIELD_MAP.image);
  const rawImages = item[FIELD_MAP.images[0]] ?? item[FIELD_MAP.images[1]];
  const imageUrls: string[] = [];
  if (rawImage) imageUrls.push(String(rawImage));
  if (rawImages) {
    const arr = Array.isArray(rawImages) ? rawImages : [rawImages];
    for (const u of arr) {
      const url = typeof u === 'string' ? u : (u as Record<string, unknown>)['#text'] ?? (u as Record<string, unknown>)['@_url'];
      if (url) imageUrls.push(String(url));
    }
  }

  const description = getFirstMatch(item, FIELD_MAP.description) as string | undefined;
  const slug = `${slugify(name)}-${sku}`.replace(/--+/g, '-').slice(0, 200);

  return {
    storeId,
    sku,
    name,
    slug,
    description: description ?? null,
    shortDescription: description ? description.slice(0, 500) : null,
    barcode: (getFirstMatch(item, FIELD_MAP.barcode) as string) ?? null,
    brand: (getFirstMatch(item, FIELD_MAP.brand) as string) ?? null,
    listPrice: listPrice || 0,
    salePrice: salePrice || 0,
    stockQuantity: Math.max(0, Math.floor(quantity)),
    images: imageUrls,
  };
}

/** XML ağacından ürün listesini çıkarır (RSS, channel/item, products/product vb.) */
function extractItemsFromParsedXml(parsed: Record<string, unknown>): XmlRawItem[] {
  const items: XmlRawItem[] = [];

  const channel = (parsed.rss as Record<string, unknown>)?.channel ?? parsed.channel;
  const feed = parsed.feed;
  const products = parsed.products ?? parsed.catalog ?? parsed.feed;

  const tryPush = (arr: unknown) => {
    if (Array.isArray(arr)) arr.forEach((i) => items.push(i as XmlRawItem));
    else if (arr && typeof arr === 'object') items.push(arr as XmlRawItem);
  };

  if (channel) {
    const raw = (channel as Record<string, unknown>).item;
    tryPush(raw);
  }
  if (feed && Array.isArray((feed as Record<string, unknown>).entry)) {
    ((feed as Record<string, unknown>).entry as XmlRawItem[]).forEach((i) => items.push(i));
  }
  if (products) {
    const productList = (products as Record<string, unknown>).product
      ?? (products as Record<string, unknown>).item
      ?? (products as Record<string, unknown>).urun;
    tryPush(productList);
  }
  if ((parsed as Record<string, unknown>).item) {
    tryPush((parsed as Record<string, unknown>).item);
  }

  return items;
}

export type ParseXmlToProductsResult = {
  created: number;
  updated: number;
  failed: number;
  total: number;
  errors: string[];
};

const productDataFromRow = (row: ReturnType<typeof mapXmlItemToProduct>) => ({
  name: row.name,
  slug: row.slug.slice(0, 180),
  description: row.description,
  shortDescription: row.shortDescription,
  barcode: row.barcode,
  brand: row.brand,
  listPrice: row.listPrice,
  salePrice: row.salePrice,
  stockQuantity: row.stockQuantity,
});

/**
 * Dışarıdan gelen ham XML string'ini parse eder; ürün yoksa Product tablosuna ekler, varsa günceller (Upsert).
 * Prisma şemasına göre Product + ProductImage ilişkisi kullanılır.
 */
export async function parseXmlAndUpsertProducts(
  storeId: string,
  xmlContent: string,
  options?: {
    batchSize?: number;
    onProgress?: (processed: number, total: number) => void | Promise<void>;
  }
): Promise<ParseXmlToProductsResult> {
  const batchSize = options?.batchSize ?? 50;
  const result: ParseXmlToProductsResult = { created: 0, updated: 0, failed: 0, total: 0, errors: [] };

  const parsed = parser.parse(xmlContent) as Record<string, unknown>;
  const rawItems = extractItemsFromParsedXml(parsed);
  result.total = rawItems.length;

  if (rawItems.length === 0) {
    return result;
  }

  for (let i = 0; i < rawItems.length; i += batchSize) {
    const batch = rawItems.slice(i, i + batchSize);
    for (let j = 0; j < batch.length; j++) {
      const index = i + j;
      try {
        const row = mapXmlItemToProduct(batch[j], storeId, index);
        const data = productDataFromRow(row);

        const product = await prisma.product.upsert({
          where: { storeId_sku: { storeId, sku: row.sku } },
          create: {
            storeId: row.storeId,
            sku: row.sku,
            ...data,
          },
          update: data,
        });

        if (product.createdAt.getTime() === product.updatedAt.getTime()) {
          result.created++;
        } else {
          result.updated++;
        }

        if (row.images.length > 0) {
          await prisma.productImage.deleteMany({ where: { productId: product.id } });
          await prisma.productImage.createMany({
            data: row.images.slice(0, 10).map((url, sortOrder) => ({
              productId: product.id,
              url,
              alt: row.name,
              sortOrder,
            })),
          });
        }
      } catch (e) {
        result.failed++;
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`[${index}] ${msg}`);
      }
    }
    if (options?.onProgress) {
      await options.onProgress(Math.min(i + batch.length, rawItems.length), rawItems.length);
    }
  }

  return result;
}

/**
 * XML URL'sini çekip parse eder, ürünleri Product tablosuna upsert eder.
 * Dahili olarak parseXmlAndUpsertProducts kullanır.
 */
export async function parseXmlToProducts(
  storeId: string,
  xmlUrl: string,
  options?: {
    batchSize?: number;
    onProgress?: (processed: number, total: number) => void | Promise<void>;
  }
): Promise<ParseXmlToProductsResult> {
  let response: Response;
  try {
    response = await fetch(xmlUrl, {
      headers: { Accept: 'application/xml, text/xml, */*' },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    const cause = fetchErr instanceof Error && fetchErr.cause instanceof Error ? fetchErr.cause.message : '';
    throw new Error(
      `XML adresine ulaşılamadı: ${xmlUrl}. Hata: ${msg}${cause ? ` (${cause})` : ''}. URL erişilebilir olmalı.`
    );
  }
  if (!response.ok) {
    throw new Error(`XML indirilemedi: ${response.status} ${response.statusText} - ${xmlUrl}`);
  }
  const xmlData = await response.text();
  return parseXmlAndUpsertProducts(storeId, xmlData, options);
}
