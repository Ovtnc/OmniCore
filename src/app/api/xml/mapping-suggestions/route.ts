/**
 * XML etiketlerini Product alanlarına algoritma ile eşleştirme (AI kullanılmaz).
 * Tüm alan–etiket olasılıkları puanlanır, en iyi global atama seçilir.
 * POST body: { xmlTags: string[], sampleValues?: Record<string, string> }
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  PRODUCT_MAIN_FIELDS,
  VARIANT_ATTRIBUTE_TYPES,
  NUMERIC_FIELD_KEYS,
} from '@/lib/xml-mapping-config';

/** Alan anahtarı → olası XML etiket adları (TR, EN, yaygın varyantlar) */
const FIELD_SYNONYMS: Record<string, string[]> = {
  name: [
    'name', 'title', 'baslik', 'urun_adi', 'urunadi', 'productname', 'product_name',
    'adi', 'ad', 'baslik', 'title', 'product_title', 'urun_baslik', 'name_tr', 'name_en',
  ],
  description: [
    'description', 'aciklama', 'desc', 'urun_aciklama', 'long_description', 'detay',
    'content', 'icerik', 'full_description', 'ozet', 'text',
  ],
  shortDescription: [
    'short_description', 'kisa_aciklama', 'short_desc', 'ozet', 'summary', 'short',
  ],
  sku: [
    'sku', 'stok_kodu', 'stokkodu', 'code', 'urun_kodu', 'product_code', 'item_code',
    'kod', 'mpn', 'part_number', 'model', 'referans',
  ],
  barcode: [
    'barcode', 'barkod', 'ean', 'gtin', 'upc', 'isbn',
  ],
  brand: [
    'brand', 'marka', 'manufacturer', 'uretici', 'firma', 'vendor',
    'brandid', 'brand_id', 'brandId', 'BrandId', 'marka_id', 'manufacturer_id',
  ],
  category: [
    'category', 'kategori', 'cat', 'kategoriler', 'categories', 'catalog', 'katalog',
    'path', 'category_path', 'kategori_yolu',
    'categoryid', 'category_id', 'categoryId', 'CategoryId', 'kategori_id', 'cat_id',
  ],
  trendyolBrandId: [
    'brandid', 'brand_id', 'brandId', 'BrandId', 'marka_id', 'trendyol_brand_id',
    'trendyol_brandid', 'manufacturer_id', 'marka_kod',
  ],
  trendyolCategoryId: [
    'categoryid', 'category_id', 'categoryId', 'CategoryId', 'kategori_id', 'cat_id',
    'trendyol_category_id', 'trendyol_categoryid', 'catalog_id',
  ],
  listPrice: [
    'list_price', 'liste_fiyat', 'listefiyat', 'piyasa_fiyat', 'market_price',
    'fiyat_liste', 'msrp', 'price_before', 'eski_fiyat',
  ],
  salePrice: [
    'sale_price', 'satis_fiyat', 'satisfiyat', 'price', 'fiyat', 'selling_price',
    'current_price', 'ucret', 'fiyat_satis',
  ],
  costPrice: [
    'cost_price', 'maliyet', 'cost', 'maliyet_fiyat', 'purchase_price', 'alış_fiyat',
  ],
  stockQuantity: [
    'stock', 'stock_quantity', 'stok', 'stok_adedi', 'quantity', 'miktar', 'qty',
    'adet', 'inventory', 'stok_miktar', 'available',
  ],
  taxRate: [
    'tax_rate', 'tax', 'kdv', 'kdv_oran', 'vat', 'vergi', 'tax_rate',
  ],
  weight: [
    'weight', 'agirlik', 'weight_kg', 'kilo', 'kg', 'gram', 'g',
  ],
  image: [
    'image', 'resim', 'img', 'picture', 'photo', 'gorsel', 'main_image', 'ana_gorsel',
    'image_url', 'resim_url', 'thumbnail', 'thumb', 'primary_image',
  ],
  images: [
    'images', 'gorseller', 'gallery', 'galeri', 'extra_images', 'ek_gorseller',
    'image_list', 'resimler', 'photos',
  ],
  // Varyant
  color: [
    'color', 'renk', 'colour', 'variant_color', 'renk_kod', 'colour_code',
  ],
  size: [
    'size', 'beden', 'ebat', 'olcu', 'dimension', 'variant_size', 'numara',
  ],
  material: [
    'material', 'materyal', 'malzeme', 'fabric', 'kumas', 'material_type',
  ],
  pattern: [
    'pattern', 'desen', 'pattern_type', 'print',
  ],
  other: [
    'variant', 'varyant', 'option', 'secenek', 'attribute', 'ozellik', 'other',
  ],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\-_\.]+/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/** İki string arasında benzerlik (0-1). Önce tam eşleşme, sonra içerme, sonra Jaccard. */
function similarity(tagNorm: string, fieldNorm: string, synonyms: string[]): number {
  if (tagNorm === fieldNorm) return 1;
  const synNorm = synonyms.map(normalize);
  if (synNorm.includes(tagNorm)) return 1;
  if (tagNorm.length >= 2 && fieldNorm.length >= 2) {
    if (tagNorm.includes(fieldNorm) || fieldNorm.includes(tagNorm)) return 0.92;
    for (const syn of synNorm) {
      if (syn.length < 2) continue;
      if (tagNorm.includes(syn) || syn.includes(tagNorm)) return 0.88;
    }
  }
  const tagSet = new Set(tagNorm);
  const fieldSet = new Set(fieldNorm);
  let intersect = 0;
  for (const c of tagSet) {
    if (fieldSet.has(c)) intersect++;
  }
  const union = tagSet.size + fieldSet.size - intersect;
  if (union === 0) return 0;
  const jaccard = intersect / union;
  if (jaccard >= 0.7) return 0.7 + jaccard * 0.2;
  if (jaccard >= 0.5) return 0.5 + (jaccard - 0.5);
  return jaccard * 0.8;
}

function looksLikeNumeric(value: string | undefined): boolean {
  if (value == null || value === '') return true;
  const t = String(value).trim();
  if (t.length > 50) return false;
  const n = parseFloat(t.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n);
}

function looksLikeUrl(value: string | undefined): boolean {
  if (value == null || value === '') return false;
  const t = String(value).trim();
  return /^https?:\/\//i.test(t) || /^\/\//.test(t) || t.startsWith('data:');
}

/** Her (alan, etiket) için puan hesapla; sonra açgözlü atama ile her etiket en fazla bir alana. */
function computeSuggestions(
  xmlTags: string[],
  sampleValues: Record<string, string>,
  fields: ReadonlyArray<{ key: string }>
): Array<{ productField: string; xmlTag: string; confidence: number }> {
  const tagNorm = (t: string) => normalize(t);
  type Pair = { field: string; tag: string; score: number };
  const pairs: Pair[] = [];

  for (const field of fields) {
    const key = field.key;
    const synonyms = FIELD_SYNONYMS[key] ?? [key];
    const fieldNorm = normalize(key);

    for (const tag of xmlTags) {
      const norm = tagNorm(tag);
      let score = similarity(norm, fieldNorm, synonyms);

      if (NUMERIC_FIELD_KEYS.includes(key) && looksLikeNumeric(sampleValues[tag])) {
        score = Math.min(1, score + 0.12);
      }
      if ((key === 'image' || key === 'images') && looksLikeUrl(sampleValues[tag])) {
        score = Math.min(1, score + 0.1);
      }
      if (score >= 0.35) {
        pairs.push({ field: key, tag, score });
      }
    }
  }

  pairs.sort((a, b) => b.score - a.score);
  const assignedField = new Set<string>();
  const assignedTag = new Set<string>();
  const result: Array<{ productField: string; xmlTag: string; confidence: number }> = [];

  for (const { field, tag, score } of pairs) {
    if (assignedField.has(field) || assignedTag.has(tag)) continue;
    assignedField.add(field);
    assignedTag.add(tag);
    result.push({ productField: field, xmlTag: tag, confidence: Math.round(score * 100) / 100 });
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const xmlTags = Array.isArray(body.xmlTags) ? (body.xmlTags as string[]) : [];
    const sampleValues =
      typeof body.sampleValues === 'object' && body.sampleValues !== null
        ? (body.sampleValues as Record<string, string>)
        : {};

    if (xmlTags.length === 0) {
      return NextResponse.json(
        { error: 'xmlTags dizisi gerekli' },
        { status: 400 }
      );
    }

    const suggestions = computeSuggestions(
      xmlTags,
      sampleValues,
      PRODUCT_MAIN_FIELDS
    );
    const variants = computeSuggestions(
      xmlTags,
      sampleValues,
      VARIANT_ATTRIBUTE_TYPES
    );

    return NextResponse.json({
      suggestions: suggestions.map((s) => ({
        productField: s.productField,
        xmlTag: s.xmlTag ?? '',
        confidence: Math.min(1, Math.max(0, s.confidence)),
      })),
      variants: variants.map((v) => ({
        productField: v.productField,
        xmlTag: v.xmlTag ?? '',
        confidence: Math.min(1, Math.max(0, v.confidence)),
      })),
      model: 'algorithm',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('mapping-suggestions error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
