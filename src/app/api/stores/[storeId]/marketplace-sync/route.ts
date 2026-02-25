/**
 * Seçilen ürünleri pazaryeri kuyruğuna ekler (Mağazaya yolla).
 * POST body: { productIds: string[] }
 */
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

    for (const productId of validIds) {
      await marketplaceSyncQueue.add(
        `sync-${productId}-${Date.now()}`,
        {
          storeId,
          type: 'product',
          productId,
          platform: '',
          payload: {},
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );
    }

    return NextResponse.json({
      ok: true,
      queued: validIds.length,
      message: `${validIds.length} ürün pazaryeri kuyruğuna eklendi. Worker çalışıyorsa kısa sürede gönderilecek.`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('marketplace-sync error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
