/**
 * Pazaryeri bağlantısını şifre çözülmüş credential'larla döndürür.
 * Sadece sunucu tarafında (worker, API route) kullanılmalı.
 */

import { prisma } from '@/lib/prisma';
import { decryptCredentials } from '@/lib/credentials';

export interface DecryptedMarketplaceConnection {
  id: string;
  storeId: string;
  platform: string;
  sellerId: string | null;
  apiKey: string | null;
  apiSecret: string | null;
  extraConfig: Record<string, unknown> | null;
  isActive: boolean;
  rateLimitRemaining: number | null;
  rateLimitResetAt: Date | null;
}

/**
 * Bağlantıyı getirir ve apiKey/apiSecret'ı çözer.
 * Adapter'a verilecek connection objesi: { ...extraConfig, apiKey, apiSecret, sellerId }.
 */
export async function getConnectionWithDecryptedCredentials(
  connectionId: string
): Promise<DecryptedMarketplaceConnection | null> {
  const row = await prisma.marketplaceConnection.findUnique({
    where: { id: connectionId },
  });
  if (!row) return null;
  const extra = (row.extraConfig as Record<string, unknown>) ?? {};
  return {
    id: row.id,
    storeId: row.storeId,
    platform: row.platform,
    sellerId: row.sellerId,
    apiKey: decryptCredentials(row.apiKey),
    apiSecret: decryptCredentials(row.apiSecret),
    extraConfig: Object.keys(extra).length ? extra : null,
    isActive: row.isActive,
    rateLimitRemaining: row.rateLimitRemaining,
    rateLimitResetAt: row.rateLimitResetAt,
  };
}

/**
 * Adapter'ın beklediği connection formatı: apiKey, apiSecret, sellerId + extraConfig key'leri.
 */
export function toAdapterConnection(decrypted: DecryptedMarketplaceConnection): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {
    apiKey: decrypted.apiKey ?? undefined,
    apiSecret: decrypted.apiSecret ?? undefined,
    sellerId: decrypted.sellerId ?? undefined,
  };
  if (decrypted.extraConfig && typeof decrypted.extraConfig === 'object') {
    for (const [k, v] of Object.entries(decrypted.extraConfig)) {
      if (typeof v === 'string') out[k] = v;
    }
  }
  return out;
}
