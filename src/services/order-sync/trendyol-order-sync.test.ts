/**
 * Trendyol sipariş senkronizasyonu smoke testi.
 * syncTrendyolOrders export ve tip şeklini doğrular.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    marketplaceConnection: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(undefined),
    },
    order: { upsert: vi.fn(), findMany: vi.fn() },
    orderItem: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('@/lib/marketplace-connection', () => ({
  getConnectionWithDecryptedCredentials: vi.fn(),
  toAdapterConnection: vi.fn(),
}));

describe('order-sync', () => {
  it('exports syncTrendyolOrders and option types', async () => {
    const mod = await import('./trendyol-order-sync');
    expect(typeof mod.syncTrendyolOrders).toBe('function');
    expect(mod.syncTrendyolOrders.constructor.name).toBe('AsyncFunction');
  });

  it('syncTrendyolOrders throws when store has no Trendyol connection', async () => {
    const { syncTrendyolOrders } = await import('./trendyol-order-sync');
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.marketplaceConnection.findFirst).mockResolvedValue(null);
    await expect(syncTrendyolOrders('non-existent-store')).rejects.toThrow(
      /Trendyol bağlantısı|bulunamadı/
    );
  });
});
