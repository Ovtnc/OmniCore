import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { accountingQueue } from '@/lib/queue';

/** POST - Muhasebe senkronizasyonu kuyruğa ekle */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; integrationId: string }> }
) {
  try {
    const { storeId, integrationId } = await params;
    const integration = await prisma.accountingIntegration.findFirst({
      where: { id: integrationId, storeId },
      select: { id: true, provider: true },
    });
    if (!integration) {
      return NextResponse.json({ error: 'Entegrasyon bulunamadı' }, { status: 404 });
    }

    await accountingQueue.add(
      `accounting-sync-${integrationId}-${Date.now()}`,
      {
        storeId,
        type: 'sync',
        payload: { integrationId },
      },
      { jobId: undefined }
    );

    await prisma.accountingIntegration.update({
      where: { id: integrationId },
      data: { syncError: null },
    });

    return NextResponse.json({
      ok: true,
      message: 'Senkronizasyon kuyruğa eklendi. Arka planda işlenecek.',
    });
  } catch (e) {
    console.error('Accounting sync queue error:', e);
    return NextResponse.json(
      { error: 'Kuyruğa eklenemedi' },
      { status: 500 }
    );
  }
}
