/**
 * Product model alanları ve varyant tipleri - XML etiket eşleştirme için
 */

export const PRODUCT_MAIN_FIELDS = [
  { key: 'name', label: 'Başlık / Ürün adı', type: 'string', required: true },
  { key: 'description', label: 'Açıklama', type: 'string', required: false },
  { key: 'shortDescription', label: 'Kısa açıklama', type: 'string', required: false },
  { key: 'sku', label: 'SKU / Stok kodu', type: 'string', required: true },
  { key: 'barcode', label: 'Barkod', type: 'string', required: false },
  { key: 'brand', label: 'Marka', type: 'string', required: false },
  { key: 'category', label: 'Kategori', type: 'string', required: false },
  { key: 'listPrice', label: 'Liste fiyatı', type: 'number', required: false },
  { key: 'salePrice', label: 'Satış fiyatı', type: 'number', required: true },
  { key: 'costPrice', label: 'Maliyet', type: 'number', required: false },
  { key: 'stockQuantity', label: 'Stok adedi', type: 'number', required: true },
  { key: 'taxRate', label: 'KDV oranı', type: 'number', required: false },
  { key: 'weight', label: 'Ağırlık (kg)', type: 'number', required: false },
  { key: 'image', label: 'Ana görsel URL', type: 'string', required: false },
  { key: 'images', label: 'Ek görsel URL’leri', type: 'string', required: false },
] as const;

export const VARIANT_ATTRIBUTE_TYPES = [
  { key: 'color', label: 'Renk' },
  { key: 'size', label: 'Beden' },
  { key: 'material', label: 'Materyal' },
  { key: 'pattern', label: 'Desen' },
  { key: 'other', label: 'Diğer' },
] as const;

export type ProductMainFieldKey = (typeof PRODUCT_MAIN_FIELDS)[number]['key'];
export type VariantAttributeKey = (typeof VARIANT_ATTRIBUTE_TYPES)[number]['key'];

/** Sayısal alanlar - metin eşleşmesinde uyarı verilecek */
export const NUMERIC_FIELD_KEYS: string[] = [
  'listPrice',
  'salePrice',
  'costPrice',
  'stockQuantity',
  'taxRate',
  'weight',
];

/** Örnek değerin sayısal olup olmadığını kontrol et (validation için) */
export function looksLikeNumeric(value: string | undefined): boolean {
  if (value == null || value === '') return true;
  const trimmed = String(value).trim();
  if (trimmed.length > 50) return false; // Uzun metin muhtemelen sayı değil
  const num = parseFloat(trimmed.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(num);
}

/** Hatalı eşleşme: sayısal alana metin eşlemesi */
export function getMappingValidationErrors(
  fieldKey: string,
  xmlTag: string,
  sampleValue: string | undefined
): string[] {
  const errors: string[] = [];
  if (NUMERIC_FIELD_KEYS.includes(fieldKey) && !looksLikeNumeric(sampleValue)) {
    errors.push(
      `"${xmlTag}" metin içeriyor gibi görünüyor. ${fieldKey} alanı sayısal olmalı (örn: fiyat, stok). Bu eşleşmeyi kaydetmek hatalı veriye yol açabilir.`
    );
  }
  return errors;
}
