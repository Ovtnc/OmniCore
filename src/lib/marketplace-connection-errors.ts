/**
 * Pazaryeri bağlantı testi hata mesajlarını kullanıcı dostu metne ve HTTP status'a çevirir.
 */

export function toUserFriendlyConnectionError(
  message: string
): { status: number; error: string } {
  const lower = message.toLowerCase();
  if (lower.includes('404') || lower.includes('not found') || lower.includes('bulunamadı')) {
    return {
      status: 404,
      error:
        'API adresi bulunamadı veya Satıcı ID hatalı. Lütfen Satıcı ID ve API adresini kontrol edin.',
    };
  }
  if (
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('yetkisiz')
  ) {
    return {
      status: 401,
      error:
        'API anahtarları geçersiz veya yetkiniz yok. API Key ve API Secret değerlerini kontrol edin.',
    };
  }
  if (lower.includes('400') || lower.includes('bad request')) {
    return {
      status: 400,
      error:
        'Geçersiz istek. Girdiğiniz bilgileri (Satıcı ID, API Key, API Secret) kontrol edin.',
    };
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return {
      status: 429,
      error: 'Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin.',
    };
  }
  if (lower.includes('500') || lower.includes('502') || lower.includes('503')) {
    return {
      status: 502,
      error: "Pazaryeri API'si şu an yanıt vermiyor. Lütfen daha sonra tekrar deneyin.",
    };
  }
  return {
    status: 400,
    error: message || 'Bağlantı testi başarısız. Bilgilerinizi kontrol edip tekrar deneyin.',
  };
}
