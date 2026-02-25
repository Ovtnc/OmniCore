import { auth } from '@/auth';

/**
 * Oturumdaki aktif tenant ID. API ve server component'larda kullanın.
 * Giriş yapmamış veya tenant'ı olmayan kullanıcı için null döner.
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.tenantId ?? null;
}

/**
 * Oturumdaki kullanıcı ID.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Oturumdaki plan (SaaS paket kontrolü için).
 */
export async function getCurrentPlan(): Promise<'STARTER' | 'GROWTH' | 'ENTERPRISE' | null> {
  const session = await auth();
  return session?.user?.plan ?? null;
}
