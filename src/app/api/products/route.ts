import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET - Ürün listesi (isteğe bağlı storeId, arama, sayfalama) */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const q = searchParams.get('q')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: { storeId?: string; OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; sku?: { contains: string; mode: 'insensitive' }; barcode?: { contains: string; mode: 'insensitive' } }> } = {};
    if (storeId) where.storeId = storeId;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          storeId: true,
          sku: true,
          name: true,
          slug: true,
          listPrice: true,
          salePrice: true,
          stockQuantity: true,
          isActive: true,
          brand: true,
          barcode: true,
          createdAt: true,
          updatedAt: true,
          store: { select: { name: true, slug: true } },
          images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.error('Products list error:', e);
    return NextResponse.json({ error: 'Ürünler listelenemedi' }, { status: 500 });
  }
}
