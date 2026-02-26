/**
 * XML / sihirbaz import sırasında marka ve kategori adından Trendyol ID eşlemesi.
 * Mağazanın ilk aktif Trendyol bağlantısı kullanılır; getBrands ve getCategoryTree ile listeler alınır.
 */
import { prisma } from '@/lib/prisma';
import { getConnectionWithDecryptedCredentials, toAdapterConnection } from '@/lib/marketplace-connection';
import { getMarketplaceAdapter } from '@/services/marketplaces';

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\u00C0-\u024F\s]/g, '')
    .trim();
}

/** Yaprak kategorileri düz listeye çıkarır (subCategories boş olanlar). */
function flattenLeafCategories(
  categories: { id: number; name: string; subCategories?: unknown[] }[],
  pathPrefix = ''
): Array<{ id: number; name: string; path: string }> {
  const result: Array<{ id: number; name: string; path: string }> = [];
  for (const c of categories) {
    const path = pathPrefix ? `${pathPrefix} > ${c.name}` : c.name;
    const subs = (c.subCategories ?? []) as { id: number; name: string; subCategories?: unknown[] }[];
    if (subs.length === 0) {
      result.push({ id: c.id, name: c.name, path });
    } else {
      result.push(...flattenLeafCategories(subs, path));
    }
  }
  return result;
}

export interface TrendyolLookupResult {
  brandId: number | null;
  categoryId: number | null;
}

const cache = new Map<
  string,
  { brands: Map<string, number>; categories: Map<string, number>; fetchedAt: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

async function getLookupMaps(storeId: string): Promise<{
  brands: Map<string, number>;
  categories: Map<string, number>;
} | null> {
  const cacheKey = `trendyol:${storeId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { brands: cached.brands, categories: cached.categories };
  }

  const conn = await prisma.marketplaceConnection.findFirst({
    where: { storeId, platform: 'TRENDYOL', isActive: true },
  });
  if (!conn) return null;

  const decrypted = await getConnectionWithDecryptedCredentials(conn.id);
  if (!decrypted?.apiKey || !decrypted?.apiSecret) return null;

  const connection = toAdapterConnection(decrypted);
  const adapter = getMarketplaceAdapter('TRENDYOL') as unknown as {
    getBrands: (c: typeof connection) => Promise<{ id: number; name: string }[]>;
    getCategoryTree: (c: typeof connection) => Promise<{ id: number; name: string; subCategories?: unknown[] }[]>;
  };

  try {
    const [brandsList, categoryTree] = await Promise.all([
      adapter.getBrands(connection),
      adapter.getCategoryTree(connection),
    ]);

    const brands = new Map<string, number>();
    for (const b of brandsList) {
      const key = normalizeForMatch(b.name);
      if (key && !brands.has(key)) brands.set(key, b.id);
    }

    const leaves = flattenLeafCategories(categoryTree);
    const categories = new Map<string, number>();
    for (const leaf of leaves) {
      const keyName = normalizeForMatch(leaf.name);
      const keyPath = normalizeForMatch(leaf.path);
      if (keyName && !categories.has(keyName)) categories.set(keyName, leaf.id);
      if (keyPath && keyPath !== keyName && !categories.has(keyPath)) categories.set(keyPath, leaf.id);
    }

    cache.set(cacheKey, { brands, categories, fetchedAt: Date.now() });
    return { brands, categories };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[trendyol-lookup] getLookupMaps failed', { storeId, error: msg });
    return null;
  }
}

/**
 * Marka ve kategori adına göre Trendyol brandId ve categoryId döndürür.
 * XML'den gelen brand (string) ve categoryName (string) ile çağrılır; eşleşme bulunursa ID'ler dolu döner.
 */
/** Değer tam sayı ise ID olarak kullan (XML'de brandID/categoryID sayı olabilir). */
function parseId(value: string | null | undefined): number | null {
  if (value == null) return null;
  const t = String(value).trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function resolveTrendyolIds(
  storeId: string,
  brandName: string | null | undefined,
  categoryName: string | null | undefined
): Promise<TrendyolLookupResult> {
  const result: TrendyolLookupResult = { brandId: null, categoryId: null };
  if (!brandName?.trim() && !categoryName?.trim()) return result;

  const numericBrandId = parseId(brandName);
  const numericCategoryId = parseId(categoryName);
  if (numericBrandId != null) result.brandId = numericBrandId;
  if (numericCategoryId != null) result.categoryId = numericCategoryId;
  if (numericBrandId != null && numericCategoryId != null) return result;

  const maps = await getLookupMaps(storeId);
  if (!maps) return result;

  if (brandName?.trim() && result.brandId == null) {
    const key = normalizeForMatch(brandName);
    result.brandId = maps.brands.get(key) ?? null;
    if (!result.brandId) {
      for (const [brandKey, id] of maps.brands) {
        if (brandKey.includes(key) || key.includes(brandKey)) {
          result.brandId = id;
          break;
        }
      }
    }
  }

  if (categoryName?.trim() && result.categoryId == null) {
    const key = normalizeForMatch(categoryName);
    result.categoryId = maps.categories.get(key) ?? null;
    if (!result.categoryId) {
      const keyParts = key.split(/\s+>\s+/);
      const lastPart = keyParts[keyParts.length - 1]?.trim();
      if (lastPart) result.categoryId = maps.categories.get(lastPart) ?? null;
      if (!result.categoryId) {
        for (const [catKey, id] of maps.categories) {
          if (catKey.includes(key) || key.includes(catKey)) {
            result.categoryId = id;
            break;
          }
        }
      }
    }
  }

  return result;
}
