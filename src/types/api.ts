/**
 * Merkezi API yanıt tipleri.
 * Liste endpoint'leri sayfalama ile tutarlı yanıt döner.
 */

/** Sayfalı liste yanıtı (GET /api/products, /api/orders vb.) */
export interface PaginatedResponse<T> {
  /** Sayfadaki kayıtlar */
  data?: T[];
  /** Ürünler için products, siparişler için orders vb. (geriye uyumluluk) */
  products?: T[];
  orders?: T[];
  /** Toplam kayıt sayısı */
  total: number;
  /** Mevcut sayfa (1 tabanlı) */
  page: number;
  /** Sayfa başına kayıt */
  limit: number;
  /** Toplam sayfa sayısı */
  totalPages: number;
}

/** Standart API hata yanıtı */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/** Başarılı işlem yanıtı (POST/PATCH/DELETE) */
export interface ApiSuccessResponse {
  ok: boolean;
  id?: string;
  message?: string;
}
