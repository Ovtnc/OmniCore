/**
 * Trendyol API istek sarmalayıcısı.
 * 429 (rate limit) ve 503/502/504 (sunucu geçici hata) durumunda Retry-After veya
 * exponential backoff ile yeniden dener.
 */

const MAX_RETRIES = 4;
const DEFAULT_RETRY_AFTER_SEC = 60;
const INITIAL_BACKOFF_MS = 2000;

/** Retry yapılacak HTTP kodları: rate limit + geçici sunucu hataları */
const RETRYABLE_STATUSES = [429, 502, 503, 504];

export interface TrendyolRequestInit extends RequestInit {
  /** Retry yapılmasın (test bağlantısı vb.) */
  skipRetry?: boolean;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 429 / 503 / 502 / 504 alındığında Retry-After veya exponential backoff ile tekrar dener.
 * 403 ve kalıcı hatalarda retry yapmaz.
 */
export async function fetchWithTrendyolRetry(
  url: string,
  init?: TrendyolRequestInit
): Promise<Response> {
  const skipRetry = init?.skipRetry === true;
  const { skipRetry: _, ...fetchInit } = init ?? {};
  let lastResponse: Response | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < (skipRetry ? 1 : MAX_RETRIES); attempt++) {
    try {
      const res = await fetch(url, fetchInit);
      lastResponse = res;

      if (!RETRYABLE_STATUSES.includes(res.status)) {
        return res;
      }

      const retryAfterSec = res.headers.get('Retry-After');
      const waitSec =
        retryAfterSec != null && /^\d+$/.test(retryAfterSec)
          ? Math.min(parseInt(retryAfterSec, 10), 300)
          : DEFAULT_RETRY_AFTER_SEC;
      const backoffMs =
        attempt === 0 && retryAfterSec != null
          ? waitSec * 1000
          : INITIAL_BACKOFF_MS * Math.pow(2, attempt);

      console.warn(
        `[Trendyol] ${res.status} ${res.statusText}, ${(backoffMs / 1000).toFixed(1)}s sonra tekrar denenecek (deneme ${attempt + 1}/${MAX_RETRIES})`
      );
      await sleep(backoffMs);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < (skipRetry ? 0 : MAX_RETRIES - 1)) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(backoffMs);
      } else {
        throw lastError;
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error('Trendyol request failed');
}
