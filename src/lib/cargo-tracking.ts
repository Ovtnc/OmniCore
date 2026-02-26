/**
 * Returns tracking URL for known Turkish cargo providers, or null if not supported.
 */
const CARGO_TRACKING_URLS: Record<string, (code: string) => string> = {
  'yurtici': (code) => `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${encodeURIComponent(code)}`,
  'yurtiçi': (code) => `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${encodeURIComponent(code)}`,
  'yurtici kargo': (code) => `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${encodeURIComponent(code)}`,
  'aras': (code) => `https://www.araskargo.com.tr/cargo-tracking?q=${encodeURIComponent(code)}`,
  'aras kargo': (code) => `https://www.araskargo.com.tr/cargo-tracking?q=${encodeURIComponent(code)}`,
  'mng': (code) => `https://www.mngkargo.com.tr/gonderi-takip?code=${encodeURIComponent(code)}`,
  'mng kargo': (code) => `https://www.mngkargo.com.tr/gonderi-takip?code=${encodeURIComponent(code)}`,
  'ptt': (code) => `https://www.ptt.gov.tr/Sayfalar/GonderiTakip.aspx?barkod=${encodeURIComponent(code)}`,
  'ptt kargo': (code) => `https://www.ptt.gov.tr/Sayfalar/GonderiTakip.aspx?barkod=${encodeURIComponent(code)}`,
  'surat': (code) => `https://www.suratkargo.com.tr/kargo-takip/?tracking=${encodeURIComponent(code)}`,
  'sürat': (code) => `https://www.suratkargo.com.tr/kargo-takip/?tracking=${encodeURIComponent(code)}`,
  'sürat kargo': (code) => `https://www.suratkargo.com.tr/kargo-takip/?tracking=${encodeURIComponent(code)}`,
};

export function getCargoTrackingUrl(provider: string | null, trackingNumber: string | null): string | null {
  if (!provider || !trackingNumber?.trim()) return null;
  const key = provider.toLowerCase().trim();
  const fn = CARGO_TRACKING_URLS[key];
  if (!fn) return null;
  return fn(trackingNumber.trim());
}
