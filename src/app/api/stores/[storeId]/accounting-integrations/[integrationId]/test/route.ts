import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccountingIntegration } from '@/lib/integrations/IntegrationManager';
import type { AccountingProvider } from '@prisma/client';
import type { IntegrationCredentials } from '@/lib/integrations/types';

/** POST - Muhasebe bağlantısını test et */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; integrationId: string }> }
) {
  try {
    const { storeId, integrationId } = await params;
    const integration = await prisma.accountingIntegration.findFirst({
      where: { id: integrationId, storeId },
      select: { id: true, provider: true, credentials: true, settings: true },
    });
    if (!integration) {
      return NextResponse.json({ error: 'Entegrasyon bulunamadı' }, { status: 404 });
    }

    const creds = (integration.credentials as Record<string, unknown>) || {};
    const credentials: IntegrationCredentials = {
      apiKey: typeof creds.apiKey === 'string' ? creds.apiKey : undefined,
      apiSecret: typeof creds.apiSecret === 'string' ? creds.apiSecret : undefined,
      username: typeof creds.username === 'string' ? creds.username : undefined,
      password: typeof creds.password === 'string' ? creds.password : undefined,
      supplierId: typeof creds.supplierId === 'string' ? creds.supplierId : undefined,
      companyId: typeof creds.companyId === 'string' ? creds.companyId : undefined,
      clientId: typeof creds.clientId === 'string' ? creds.clientId : undefined,
      clientSecret: typeof creds.clientSecret === 'string' ? creds.clientSecret : undefined,
    };
    const settings = (integration.settings as Record<string, unknown>) || {};

    const adapter = getAccountingIntegration(
      integration.provider as AccountingProvider,
      storeId,
      credentials,
      settings
    );
    const ok = await adapter.healthCheck();

    await prisma.accountingIntegration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: ok ? new Date() : undefined,
        syncError: ok ? null : 'Bağlantı testi başarısız',
      },
    });

    if (ok) {
      return NextResponse.json({ ok: true, message: 'Bağlantı başarılı' });
    }
    return NextResponse.json(
      { ok: false, error: 'Bağlantı testi başarısız' },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    try {
      const { storeId: sid, integrationId: iid } = await params;
      await prisma.accountingIntegration.updateMany({
        where: { id: iid, storeId: sid },
        data: { syncError: message },
      });
    } catch {
      // ignore
    }
    console.error('Accounting test error:', e);
    return NextResponse.json(
      { ok: false, error: message || 'Bağlantı testi yapılamadı' },
      { status: 500 }
    );
  }
}
