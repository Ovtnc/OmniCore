/**
 * OmniCore - XML Import & Dispatcher
 * XML linkini alır, ürünleri parse eder, DB'ye upsert eder ve her ürün için
 * marketplace-sync kuyruğuna iş atar. 100.000 ürünlük XML'de bile sunucu bloke olmaz.
 */

import { XMLParser } from 'fast-xml-parser';
import { prisma } from '@/lib/prisma';
import { marketplaceSyncQueue } from '@/lib/queue';
import { resolveOrCreateCategory, setProductCategory } from '@/lib/category-resolve';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
});

type XmlItem = Record<string, unknown>;

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function toNum(val: unknown): number {
  if (val == null) return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function str(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'object' && '#text' in (val as object))
    return String((val as { '#text': unknown })['#text'] ?? '').trim();
  return String(val).trim();
}

/** Nokta ile ayrılmış path ile nested objeden değer alır (özel eşleme için) */
function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Parse edilmiş XML ağacından ürün listesini çıkarır */
function extractItems(parsed: Record<string, unknown>): XmlItem[] {
  const products = parsed.products ?? parsed.catalog ?? parsed.feed;
  const root = parsed.root ?? parsed.channel;
  const fromProducts = products
    ? toArray((products as Record<string, unknown>).product ?? (products as Record<string, unknown>).item ?? (products as Record<string, unknown>).urun)
    : [];
  const fromRoot = root
    ? toArray((root as Record<string, unknown>).item ?? (root as Record<string, unknown>).product)
    : [];
  const direct = toArray(parsed.item ?? parsed.product);
  return (fromProducts.length ? fromProducts : fromRoot.length ? fromRoot : direct) as XmlItem[];
}

/** Tek bir XML item'ından Product create/update verisi üretir */
function itemToProductData(item: XmlItem, storeId: string, index: number) {
  const sku =
    str(item.stockCode ?? item.sku ?? item.id ?? item.code ?? item.barkod) ||
    `xml-${Date.now()}-${index}`;
  const name = str(item.name ?? item.title ?? item.baslik ?? item.product_name) || 'İsimsiz Ürün';
  const listPrice = toNum(item.listPrice ?? item.list_price ?? item.price ?? item.fiyat ?? item.msrp);
  const salePriceNum = toNum(item.salePrice ?? item.sale_price ?? item.satis_fiyati ?? item.price);
  const salePrice = salePriceNum > 0 ? salePriceNum : listPrice || 0;
  const stockQuantity = Math.max(0, Math.floor(toNum(item.stock ?? item.quantity ?? item.stok ?? item.qty)));
  const description = str(item.description ?? item.desc ?? item.aciklama);
  const barcode = str(item.barcode ?? item.barkod ?? item.gtin) || null;
  const brand = str(item.brand ?? item.marka) || null;

  const imageUrls: string[] = [];
  const rawImg = item.image ?? item.image_link ?? item.resim;
  const rawImgs = item.images ?? item.gallery;
  if (rawImg) imageUrls.push(str(rawImg));
  if (rawImgs) {
    const arr = toArray(rawImgs);
    for (const u of arr) {
      const url = typeof u === 'string' ? u : str((u as Record<string, unknown>)['#text'] ?? (u as Record<string, unknown>)['url']);
      if (url) imageUrls.push(url);
    }
  }

  const categoryName =
    str(item.category ?? item.category_name ?? item.kategori ?? item.cat ?? item.categoryName) || null;

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${sku}`.slice(0, 180);

  return {
    storeId,
    sku,
    name,
    slug,
    description: description || null,
    shortDescription: description ? description.slice(0, 500) : null,
    barcode,
    brand,
    listPrice: Math.max(0, listPrice || salePrice),
    salePrice: Math.max(0, salePrice),
    stockQuantity,
    images: imageUrls,
    categoryName,
  };
}

/** Özel fieldMapping / variantMapping ile XML item'ından Product verisi üretir */
function itemToProductDataWithMapping(
  item: XmlItem,
  storeId: string,
  index: number,
  fieldMapping: Record<string, string>,
  variantMapping: Array<{ attributeKey: string; xmlTag: string }>
) {
  const get = (productField: string): unknown => {
    const xmlTag = fieldMapping[productField];
    if (!xmlTag) return undefined;
    return getValueByPath(item as Record<string, unknown>, xmlTag);
  };
  const getStr = (productField: string) => str(get(productField));
  const getNum = (productField: string) => toNum(get(productField));

  const sku = getStr('sku') || `xml-${Date.now()}-${index}`;
  const name = getStr('name') || 'İsimsiz Ürün';
  const listPrice = Math.max(0, getNum('listPrice') || getNum('salePrice'));
  const salePrice = Math.max(0, getNum('salePrice') || listPrice);
  const stockQuantity = Math.max(0, Math.floor(getNum('stockQuantity')));
  const description = getStr('description') || null;
  const barcode = getStr('barcode') || null;
  const brand = getStr('brand') || null;

  const imageUrls: string[] = [];
  const imgVal = get('image');
  const imgsVal = get('images');
  if (imgVal) imageUrls.push(str(imgVal));
  if (imgsVal) {
    const arr = toArray(imgsVal);
    for (const u of arr) {
      const url = typeof u === 'string' ? u : str((u as Record<string, unknown>)?.['#text'] ?? (u as Record<string, unknown>)?.url);
      if (url) imageUrls.push(url);
    }
  }

  const attributes: Record<string, string> = {};
  variantMapping.forEach(({ attributeKey, xmlTag }) => {
    if (!xmlTag) return;
    const v = str(getValueByPath(item as Record<string, unknown>, xmlTag));
    if (v) attributes[attributeKey] = v;
  });

  const categoryName = getStr('category') || null;

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${sku}`.slice(0, 180);

  return {
    storeId,
    sku,
    name,
    slug,
    description,
    shortDescription: description ? description.slice(0, 500) : null,
    barcode,
    brand,
    listPrice,
    salePrice,
    stockQuantity,
    images: imageUrls,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    categoryName,
  };
}

export interface ProcessXmlFeedResult {
  total: number;
  created: number;
  updated: number;
  queued: number;
  failed: number;
  errors: string[];
}

export type ProcessXmlFeedOptions = {
  /** Her N ürün sonrası ilerleme raporu (DB job güncellemesi için) */
  onProgress?: (processed: number, total: number, partial: ProcessXmlFeedResult) => Promise<void>;
  /** Sihirbazdan gelen özel alan eşlemesi (productField -> xmlTag) */
  fieldMapping?: Record<string, string>;
  /** Varyant alan eşlemesi (renk, beden vb.) */
  variantMapping?: Array<{ attributeKey: string; xmlTag: string }>;
  /** true ise pazaryeri kuyruğuna ekleme yapılmaz; ürünler sadece kataloğa eklenir */
  skipMarketplaceSync?: boolean;
};

/**
 * XML URL'sini indirir, parse eder, her ürünü DB'ye upsert eder ve
 * her biri için marketplace-sync kuyruğuna iş ekler.
 */
export async function processXmlFeed(
  storeId: string,
  xmlUrl: string,
  options?: ProcessXmlFeedOptions
): Promise<ProcessXmlFeedResult> {
  const result: ProcessXmlFeedResult = {
    total: 0,
    created: 0,
    updated: 0,
    queued: 0,
    failed: 0,
    errors: [],
  };

  const response = await fetch(xmlUrl, {
    headers: { Accept: 'application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`XML indirilemedi: ${response.status} ${response.statusText}`);
  }
  const xmlData = await response.text();
  const parsed = parser.parse(xmlData) as Record<string, unknown>;
  const items = extractItems(parsed);
  result.total = items.length;

  const fieldMapping = options?.fieldMapping ?? {};
  const variantMapping = options?.variantMapping ?? [];
  const useCustomMapping = Object.keys(fieldMapping).length > 0;

  for (let i = 0; i < items.length; i++) {
    try {
      const row = useCustomMapping
        ? itemToProductDataWithMapping(items[i], storeId, i, fieldMapping, variantMapping)
        : itemToProductData(items[i], storeId, i);
      const rowWithAttrs = row as typeof row & { attributes?: Record<string, string> };
      const updateData: Parameters<typeof prisma.product.upsert>[0]['update'] = {
        name: row.name,
        description: row.description,
        shortDescription: row.shortDescription,
        barcode: row.barcode,
        brand: row.brand,
        listPrice: row.listPrice,
        salePrice: row.salePrice,
        stockQuantity: row.stockQuantity,
        updatedAt: new Date(),
      };
      if (rowWithAttrs.attributes && Object.keys(rowWithAttrs.attributes).length > 0) {
        updateData.attributes = rowWithAttrs.attributes;
      }
      const createData: Parameters<typeof prisma.product.upsert>[0]['create'] = {
        storeId: row.storeId,
        sku: row.sku,
        name: row.name,
        slug: row.slug,
        description: row.description,
        shortDescription: row.shortDescription,
        barcode: row.barcode,
        brand: row.brand,
        listPrice: row.listPrice,
        salePrice: row.salePrice,
        stockQuantity: row.stockQuantity,
      };
      if (rowWithAttrs.attributes && Object.keys(rowWithAttrs.attributes).length > 0) {
        createData.attributes = rowWithAttrs.attributes;
      }
      const product = await prisma.product.upsert({
        where: { storeId_sku: { storeId, sku: row.sku } },
        update: updateData,
        create: createData,
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

      const rowWithCategory = row as typeof row & { categoryName?: string | null };
      if (rowWithCategory.categoryName?.trim()) {
        const categoryId = await resolveOrCreateCategory(storeId, rowWithCategory.categoryName.trim());
        if (categoryId) {
          await setProductCategory(product.id, categoryId, true);
        }
      }

      if (!options?.skipMarketplaceSync) {
        await marketplaceSyncQueue.add(
          `sync-${product.id}`,
          {
            storeId,
            productId: product.id,
            type: 'product',
            platform: '',
            payload: {},
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          }
        );
        result.queued++;
      }
    } catch (e) {
      result.failed++;
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`[${i}] ${msg}`);
    }
    if (options?.onProgress && (i + 1) % 10 === 0) {
      await options.onProgress(i + 1, result.total, { ...result });
    }
  }

  if (options?.onProgress && result.total > 0) {
    await options.onProgress(result.total, result.total, result);
  }
  return result;
}

// ============== Seçimli içe aktarım: Geçici tabloya yazma ==============

export interface ProcessXmlFeedToBatchResult {
  total: number;
  created: number;
  failed: number;
  errors: string[];
  batchId: string;
}

export type ProcessXmlFeedToBatchOptions = {
  fieldMapping?: Record<string, string>;
  variantMapping?: Array<{ attributeKey: string; xmlTag: string }>;
  onProgress?: (processed: number, total: number, partial: ProcessXmlFeedToBatchResult) => Promise<void>;
};

/**
 * XML'i parse eder ve ürünleri XmlImportItem (geçici tablo) olarak yazar.
 * Ana Product tablosuna ve marketplace-sync'e dokunmaz. Ön izleme sayfasında
 * kullanıcı seçim yaptıktan sonra confirm API ile kalıcı kayıt yapılır.
 */
export async function processXmlFeedToBatch(
  storeId: string,
  xmlUrl: string,
  batchId: string,
  options?: ProcessXmlFeedToBatchOptions
): Promise<ProcessXmlFeedToBatchResult> {
  const result: ProcessXmlFeedToBatchResult = {
    total: 0,
    created: 0,
    failed: 0,
    errors: [],
    batchId,
  };

  const response = await fetch(xmlUrl, {
    headers: { Accept: 'application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`XML indirilemedi: ${response.status} ${response.statusText}`);
  }
  const xmlData = await response.text();
  const parsed = parser.parse(xmlData) as Record<string, unknown>;
  const items = extractItems(parsed);
  result.total = items.length;

  await prisma.xmlImportBatch.update({
    where: { id: batchId },
    data: { status: 'IMPORTING', totalCount: items.length },
  });

  const fieldMapping = options?.fieldMapping ?? {};
  const variantMapping = options?.variantMapping ?? [];
  const useCustomMapping = Object.keys(fieldMapping).length > 0;

  for (let i = 0; i < items.length; i++) {
    try {
      const row = useCustomMapping
        ? itemToProductDataWithMapping(items[i], storeId, i, fieldMapping, variantMapping)
        : itemToProductData(items[i], storeId, i);
      const rowWithAttrs = row as typeof row & { attributes?: Record<string, string> };

      const rowWithCat = row as typeof row & { categoryName?: string | null };
      await prisma.xmlImportItem.create({
        data: {
          batchId,
          storeId,
          sku: row.sku,
          name: row.name,
          slug: row.slug,
          description: row.description,
          shortDescription: row.shortDescription,
          listPrice: row.listPrice,
          salePrice: row.salePrice,
          stockQuantity: row.stockQuantity,
          barcode: row.barcode,
          brand: row.brand,
          categoryName: rowWithCat.categoryName?.trim() || undefined,
          imageUrls: row.images?.length ? (row.images as unknown as object) : undefined,
          attributes: rowWithAttrs.attributes ?? undefined,
        },
      });
      result.created++;
    } catch (e) {
      result.failed++;
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`[${i}] ${msg}`);
    }
    if (options?.onProgress && (i + 1) % 50 === 0) {
      await options.onProgress(i + 1, result.total, { ...result });
    }
  }

  await prisma.xmlImportBatch.update({
    where: { id: batchId },
    data: { status: 'PENDING' },
  });

  if (options?.onProgress && result.total > 0) {
    await options.onProgress(result.total, result.total, result);
  }
  return result;
}
