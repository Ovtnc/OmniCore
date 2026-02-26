const BRAND_LABELS: Record<string, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  AMAZON: 'Amazon',
  N11: 'N11',
  SHOPIFY: 'Shopify',
  WOOCOMMERCE: 'WooCommerce',
  MAGENTO: 'Magento',
  CIMRI: 'Cimri',
  AKAKCE: 'Akakçe',
  GOOGLE_MERCHANT: 'Google Merchant',
  META_CATALOG: 'Meta Katalog',
  GITTIGIDIYOR: 'GittiGidiyor',
  EPTTAA: 'ePttAVM',
  CICEKSEPETI: 'Çiçeksepeti',
  MORHIPO: 'Morhipo',
  PAZARAMA: 'Pazarama',
  IDEFIX: 'İdefix',
  GOTURC: 'GoTurc',
  PTTAVM: 'PTT AVM',
  MODANISA: 'Modanisa',
  ALLESGO: 'Allesgo',
  LOGO: 'Logo',
  MIKRO: 'Mikro',
  DIA: 'DİA',
  PARASUT: 'Paraşüt',
  BIZIMHESAP: 'Bizimhesap',
  TURKCELL_ESIRKET: 'Turkcell e-Şirket',
  LINK: 'Link',
  ETA: 'ETA',
  PAYTR: 'PayTR',
  IYZICO: 'İyzico',
  CARI_HAVALE: 'Cari / Havale',
  BANK_TRANSFER: 'Banka Transferi',
  YURTICI: 'Yurtiçi Kargo',
  ARAS: 'Aras Kargo',
  MNG: 'MNG Kargo',
  PTT: 'PTT Kargo',
  SURAT: 'Sürat Kargo',
  HOROZ: 'Horoz Lojistik',
  OTHER: 'Diğer',
};

export function getBrandLabel(code: string): string {
  return BRAND_LABELS[code] ?? code;
}

export function getBrandLogoPath(code: string): string {
  return `/brand-logos/${code}.png`;
}

