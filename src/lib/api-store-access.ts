/**
 * Veri izolasyonu: API route'larında tenantId ve storeId kontrolü.
 * Store'un ilgili tenant'a ait olduğunu doğrular.
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export interface StoreAccessResult {
  ok: true;
  storeId: string;
  tenantId: string;
}

export interface StoreAccessDenied {
  ok: false;
  error: string;
  status: 401 | 403 | 404;
}

/**
 * Oturum açmış kullanıcı ve storeId'nin bu tenant'a ait olduğunu doğrular.
 * Route handler içinde kullanın; yetkisiz erişimde JSON yanıtı döndürülebilir.
 */
export async function assertStoreAccess(storeId: string): Promise<StoreAccessResult | StoreAccessDenied> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Oturum açmanız gerekiyor', status: 401 };
  }

  const tenantId = (session.user as { tenantId?: string | null }).tenantId ?? null;
  if (!tenantId) {
    return { ok: false, error: 'Tenant bilgisi bulunamadı', status: 403 };
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId, tenantId },
    select: { id: true, tenantId: true },
  });
  if (!store) {
    return { ok: false, error: 'Mağaza bulunamadı veya erişim yetkiniz yok', status: 404 };
  }

  return { ok: true, storeId: store.id, tenantId: store.tenantId };
}

/**
 * Sadece store'un tenant'a ait olup olmadığını kontrol eder (session zorunlu değil).
 * Public route'larda storeId geçerliliği için kullanılabilir.
 */
export async function isStoreInTenant(storeId: string, tenantId: string): Promise<boolean> {
  const store = await prisma.store.findFirst({
    where: { id: storeId, tenantId },
    select: { id: true },
  });
  return !!store;
}
