/**
 * Auth yardımcıları smoke testi.
 * getCurrentTenantId vb. export'ları doğrular (auth mock'lu).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

describe('auth helpers', () => {
  it('exports getCurrentTenantId, getCurrentUserId, getCurrentPlan', async () => {
    const mod = await import('@/lib/auth');
    expect(typeof mod.getCurrentTenantId).toBe('function');
    expect(typeof mod.getCurrentUserId).toBe('function');
    expect(typeof mod.getCurrentPlan).toBe('function');
  });

  it('getCurrentTenantId returns null when no session', async () => {
    const { getCurrentTenantId } = await import('@/lib/auth');
    const result = await getCurrentTenantId();
    expect(result).toBeNull();
  });
});
