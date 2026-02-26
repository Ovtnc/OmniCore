import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildNotification, collectProductIds } from '@/lib/notifications';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 100);

    const jobs = await prisma.job.findMany({
      where: storeId ? { storeId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        storeId: true,
        type: true,
        status: true,
        payload: true,
        result: true,
        error: true,
        createdAt: true,
        finishedAt: true,
        store: { select: { name: true } },
      },
    });

    const productIds = new Set<string>();
    for (const job of jobs) {
      for (const id of collectProductIds(job.payload, job.result)) productIds.add(id);
    }

    const products = productIds.size
      ? await prisma.product.findMany({
          where: { id: { in: Array.from(productIds) } },
          select: { id: true, sku: true, name: true },
        })
      : [];
    const productMap = Object.fromEntries(products.map((p) => [p.id, { sku: p.sku, name: p.name }]));

    const notifications = jobs.map((job) =>
      buildNotification({
        id: `job-${job.id}`,
        jobId: job.id,
        storeId: job.storeId,
        storeName: job.store.name,
        type: job.type,
        status: job.status,
        payload: job.payload,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        finishedAt: job.finishedAt,
        productMap,
      })
    );

    return NextResponse.json({
      items: notifications,
      unreadCandidateCount: notifications.filter((n) => n.status === 'PENDING' || n.status === 'ACTIVE').length,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Notifications list error:', e);
    return NextResponse.json({ error: 'Bildirimler alınamadı' }, { status: 500 });
  }
}

