/**
 * POST - Seçilen ürünleri toplu sil (siparişte kullanılanlar atlanır).
 * Body: { productIds: string[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const productIds = Array.isArray(body.productIds) ? (body.productIds as string[]) : [];
    if (productIds.length === 0) {
      return NextResponse.json({ error: 'En az bir ürün seçin' }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, _count: { select: { orderItems: true } } },
    });

    const toDelete = products.filter((p) => p._count.orderItems === 0).map((p) => p.id);
    const skipped = products.filter((p) => p._count.orderItems > 0).map((p) => p.id);

    for (const productId of toDelete) {
      await prisma.$transaction(async (tx) => {
        await tx.productCategory.deleteMany({ where: { productId } });
        await tx.productImage.deleteMany({ where: { productId } });
        await tx.product.delete({ where: { id: productId } });
      });
    }

    return NextResponse.json({
      ok: true,
      deleted: toDelete.length,
      skipped: skipped.length,
      message:
        skipped.length > 0
          ? `${toDelete.length} ürün silindi. ${skipped.length} ürün siparişte kullanıldığı için silinemedi.`
          : `${toDelete.length} ürün silindi.`,
    });
  } catch (e) {
    console.error('Products bulk-delete error:', e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
