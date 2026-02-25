/**
 * Trendyol sipariş senkronizasyonunu kuyruğa ekler (periyodik veya manuel tetikleme).
 * POST body: { connectionId?: string, lastDays?: number, status?: string }
 * Worker çalışıyorsa siparişler API'den çekilip Order/OrderItem olarak upsert edilir.
 */
import { JobStatus, JobType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { orderSyncQueue } from '@/lib/queue';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });
    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }

    const connection = await prisma.marketplaceConnection.findFirst({
      where: { storeId, platform: 'TRENDYOL', isActive: true },
      select: { id: true },
    });
    if (!connection) {
      return NextResponse.json(
        { error: 'Bu mağaza için aktif Trendyol bağlantısı yok' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const connectionId = typeof body.connectionId === 'string' ? body.connectionId : undefined;
    const lastDays =
      typeof body.lastDays === 'number' && body.lastDays > 0 ? body.lastDays : 7;
    const status = typeof body.status === 'string' ? body.status : undefined;

    const dbJob = await prisma.job.create({
      data: {
        storeId,
        type: JobType.MARKETPLACE_SYNC_ORDER,
        status: JobStatus.PENDING,
        payload: {
          platform: 'TRENDYOL',
          connectionId: connectionId ?? connection.id,
          lastDays,
          status,
        } as object,
      },
    });

    await orderSyncQueue.add(
      `order-sync-${storeId}-${Date.now()}`,
      {
        storeId,
        platform: 'TRENDYOL',
        connectionId: connectionId ?? connection.id,
        lastDays,
        status,
        jobId: dbJob.id,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    return NextResponse.json({
      ok: true,
      jobId: dbJob.id,
      message:
        'Sipariş senkronizasyonu kuyruğa eklendi. Worker çalışıyorsa Trendyol siparişleri veritabanına yazılacak (pnpm run queue:dev).',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('order-sync error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
