/**
 * GET - Ön izleme: XmlImportItem listesi (sayfalı, arama)
 * ?batchId=xxx&page=1&limit=20&q=
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId')?.trim();
    const q = searchParams.get('q')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const skip = (page - 1) * limit;

    if (!batchId) {
      return NextResponse.json({ error: 'batchId gerekli' }, { status: 400 });
    }

    const where: { batchId: string; OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; sku?: { contains: string; mode: 'insensitive' } }> } = { batchId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total, batch] = await Promise.all([
      prisma.xmlImportItem.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.xmlImportItem.count({ where }),
      prisma.xmlImportBatch.findUnique({
        where: { id: batchId },
        select: { id: true, storeId: true, totalCount: true, status: true, xmlUrl: true },
      }),
    ]);

    if (!batch) {
      return NextResponse.json({ error: 'Batch bulunamadı' }, { status: 404 });
    }

    const rows = items.map((item) => ({
      id: item.id,
      batchId: item.batchId,
      storeId: item.storeId,
      sku: item.sku,
      name: item.name,
      slug: item.slug,
      description: item.description,
      shortDescription: item.shortDescription,
      listPrice: Number(item.listPrice),
      salePrice: Number(item.salePrice),
      stockQuantity: item.stockQuantity,
      barcode: item.barcode,
      brand: item.brand,
      categoryName: item.categoryName ?? null,
      imageUrls: (item.imageUrls as string[] | null) ?? [],
      attributes: item.attributes as Record<string, string> | null,
    }));

    return NextResponse.json({
      items: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      batch: {
        id: batch.id,
        storeId: batch.storeId,
        totalCount: batch.totalCount,
        status: batch.status,
      },
    });
  } catch (e) {
    console.error('xml-import preview error:', e);
    return NextResponse.json({ error: 'Ön izleme listelenemedi' }, { status: 500 });
  }
}
