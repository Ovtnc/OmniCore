/**
 * XML işleyici smoke testi.
 * processXmlFeed ve processXmlFeedToBatch export'larını doğrular.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    store: { findUnique: vi.fn() },
    category: { findMany: vi.fn(), create: vi.fn() },
    product: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    productCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
    productImage: { deleteMany: vi.fn(), createMany: vi.fn() },
    xmlImportBatch: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    xmlImportItem: { createMany: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock('@/lib/queue', () => ({ marketplaceSyncQueue: { add: vi.fn() } }));
vi.mock('@/lib/category-resolve', () => ({
  resolveOrCreateCategory: vi.fn(),
  setProductCategory: vi.fn(),
}));
vi.mock('@/services/trendyol-lookup', () => ({ resolveTrendyolIds: vi.fn() }));

describe('xml-processor', () => {
  it('exports processXmlFeed and processXmlFeedToBatch', async () => {
    const mod = await import('./xml-processor');
    expect(typeof mod.processXmlFeed).toBe('function');
    expect(typeof mod.processXmlFeedToBatch).toBe('function');
  });
});
