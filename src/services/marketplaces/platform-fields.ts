/**
 * Platforma göre bağlantı formunda gösterilecek ek alanlar.
 * extraConfig veya connection kaydında kullanılır.
 */

export type FieldType = 'text' | 'password' | 'select';

/** Değerin nereye yazılacağı: apiKey/apiSecret şifreli, sellerId ve extraConfig ayrı */
export type StoreAs = 'apiKey' | 'apiSecret' | 'sellerId' | 'extra';

export interface PlatformFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  /** N11 appKey -> apiKey gibi eşleme; yoksa extraConfig'e gider */
  storeAs?: StoreAs;
}

export const PLATFORM_CONNECTION_FIELDS: Record<string, PlatformFieldConfig[]> = {
  TRENDYOL: [
    { name: 'sellerId', label: 'Satıcı ID / Supplier ID', type: 'text', placeholder: 'Trendyol satıcı numarası', required: true, storeAs: 'sellerId' },
  ],
  HEPSIBURADA: [
    { name: 'sellerId', label: 'Satıcı ID / Merchant ID', type: 'text', placeholder: 'Hepsiburada satıcı ID', required: true, storeAs: 'sellerId' },
  ],
  AMAZON: [
    { name: 'region', label: 'Bölge (Region)', type: 'select', required: true, storeAs: 'extra', options: [
      { value: 'eu', label: 'Avrupa (EU)' },
      { value: 'na', label: 'Kuzey Amerika (NA)' },
      { value: 'fe', label: 'Uzak Doğu (FE)' },
    ]},
    { name: 'sellerId', label: 'Seller ID', type: 'text', placeholder: 'Amazon Seller ID', required: true, storeAs: 'sellerId' },
  ],
  N11: [
    { name: 'appKey', label: 'App Key', type: 'text', placeholder: 'N11 uygulama anahtarı', required: true, storeAs: 'apiKey' },
    { name: 'appSecret', label: 'App Secret', type: 'password', placeholder: '••••••••', required: true, storeAs: 'apiSecret' },
  ],
  SHOPIFY: [
    { name: 'storeDomain', label: 'Mağaza domain', type: 'text', placeholder: 'magaza.myshopify.com', required: true, storeAs: 'extra' },
    { name: 'sellerId', label: 'Store ID (opsiyonel)', type: 'text', placeholder: 'Shopify store ID', storeAs: 'sellerId' },
  ],
  CICEKSEPETI: [
    { name: 'sellerId', label: 'Satıcı kodu', type: 'text', placeholder: 'Çiçeksepeti satıcı kodu', required: true, storeAs: 'sellerId' },
  ],
  PAZARAMA: [
    { name: 'sellerId', label: 'Satıcı ID', type: 'text', placeholder: 'Pazarama satıcı ID', required: true, storeAs: 'sellerId' },
  ],
  IDEFIX: [
    { name: 'sellerId', label: 'Satıcı kodu', type: 'text', placeholder: 'İdefix satıcı kodu', storeAs: 'sellerId' },
  ],
  GOTURC: [
    { name: 'sellerId', label: 'Satıcı ID', type: 'text', placeholder: 'GoTurc satıcı ID', storeAs: 'sellerId' },
  ],
  PTTAVM: [
    { name: 'sellerId', label: 'Satıcı kodu', type: 'text', placeholder: 'PTT Avm satıcı kodu', storeAs: 'sellerId' },
  ],
  MODANISA: [
    { name: 'sellerId', label: 'Satıcı ID', type: 'text', placeholder: 'ModaNisa satıcı ID', storeAs: 'sellerId' },
  ],
  ALLESGO: [
    { name: 'sellerId', label: 'Satıcı ID', type: 'text', placeholder: 'Allesgo satıcı ID', storeAs: 'sellerId' },
  ],
};

/** Ortak alanlar (çoğu platformda): apiKey, apiSecret, sellerId bazılarında ayrı config'de */
export const COMMON_FIELD_NAMES = ['apiKey', 'apiSecret', 'sellerId'] as const;

/** Seçilen platforma göre ek alan listesi döner */
export function getPlatformFields(platform: string): PlatformFieldConfig[] {
  const key = platform.toUpperCase().replace(/\s/g, '');
  return PLATFORM_CONNECTION_FIELDS[key] ?? [];
}
