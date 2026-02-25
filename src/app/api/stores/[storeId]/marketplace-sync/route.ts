/**
 * Seçilen ürünleri pazaryeri kuyruğuna ekler (Mağazaya yolla).
 * POST body: { productIds: string[], connectionIds?: string[] }
 * connectionIds verilirse sadece o bağlantılara gönderilir.
 * UI'da İşler listesinde görünsün diye Prisma Job kaydı oluşturulur.
 */
import { JobStatus, JobType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { marketplaceSyncQueue } from '@/lib/queue';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await req.json().catch(() => ({}));
    const productIds = Array.isArray(body.productIds) ? (body.productIds as string[]) : [];
    const connectionIds = Array.isArray(body.connectionIds) ? (body.connectionIds as string[]) : undefined;

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: 'En az bir ürün ID gerekli (productIds)' },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, storeId },
      select: { id: true },
    });
    const validIds = products.map((p) => p.id);
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'Bu mağazaya ait geçerli ürün bulunamadı' },
        { status: 400 }
      );
    }

    const dbJob = await prisma.job.create({
      data: {
        storeId,
        type: JobType.MARKETPLACE_SYNC_PRODUCT,
        status: JobStatus.PENDING,
        payload: { productIds: validIds, total: validIds.length, connectionIds } as object,
        result: { completed: [], failed: [], total: validIds.length },
      },
    });

    const jobPayload = {
      storeId,
      type: 'product' as const,
      productId: '' as string,
      platform: '',
      payload: {} as Record<string, unknown>,
      ...(connectionIds?.length ? { connectionIds } : {}),
      jobId: dbJob.id,
      totalProducts: validIds.length,
    };

    for (const productId of validIds) {
      await marketplaceSyncQueue.add(
        `sync-${productId}-${Date.now()}`,
        { ...jobPayload, productId },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );
    }

    return NextResponse.json({
      ok: true,
      queued: validIds.length,
      jobId: dbJob.id,
      message: `${validIds.length} ürün pazaryeri kuyruğuna eklendi. Gönderimin yapılması için worker'ın çalışıyor olması gerekir (ayrı terminalde: pnpm run queue:dev).`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('marketplace-sync error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
