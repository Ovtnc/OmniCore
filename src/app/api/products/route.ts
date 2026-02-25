import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u00C0-\u024F\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'urun';
}

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

/** POST - Yeni ürün oluştur */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const storeId = typeof body.storeId === 'string' ? body.storeId.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const sku = typeof body.sku === 'string' ? body.sku.trim() : '';
    if (!storeId || !name || !sku) {
      return NextResponse.json(
        { error: 'Mağaza, ürün adı ve SKU gerekli' },
        { status: 400 }
      );
    }

    const existingBySku = await prisma.product.findUnique({
      where: { storeId_sku: { storeId, sku } },
    });
    if (existingBySku) {
      return NextResponse.json(
        { error: 'Bu mağazada bu SKU zaten kullanılıyor' },
        { status: 400 }
      );
    }

    let slug = typeof body.slug === 'string' ? body.slug.trim() : slugify(name);
    if (!slug) slug = slugify(name);
    let baseSlug = slug;
    let n = 1;
    while (
      await prisma.product.findFirst({ where: { storeId, slug } })
    ) {
      slug = `${baseSlug}-${n}`;
      n += 1;
    }

    const listPrice =
      typeof body.listPrice === 'number'
        ? body.listPrice
        : parseFloat(String(body.listPrice ?? 0));
    const salePrice =
      typeof body.salePrice === 'number'
        ? body.salePrice
        : parseFloat(String(body.salePrice ?? 0));
    if (listPrice < 0 || salePrice < 0) {
      return NextResponse.json({ error: 'Fiyatlar 0 veya üzeri olmalı' }, { status: 400 });
    }

    const categoryIds = Array.isArray(body.categoryIds)
      ? (body.categoryIds as string[]).filter((id: unknown) => typeof id === 'string')
      : [];
    const imageUrls = Array.isArray(body.imageUrls)
      ? (body.imageUrls as string[]).filter((u: unknown) => typeof u === 'string')
      : [];

    const product = await prisma.product.create({
      data: {
        storeId,
        sku,
        name,
        slug,
        shortDescription:
          typeof body.shortDescription === 'string' ? body.shortDescription.trim() || null : null,
        description: typeof body.description === 'string' ? body.description.trim() || null : null,
        barcode: typeof body.barcode === 'string' ? body.barcode.trim() || null : null,
        brand: typeof body.brand === 'string' ? body.brand.trim() || null : null,
        listPrice,
        salePrice,
        costPrice:
          body.costPrice != null && body.costPrice !== ''
            ? parseFloat(String(body.costPrice))
            : null,
        taxRate: body.taxRate != null ? parseFloat(String(body.taxRate)) : 18,
        stockQuantity: Number.isInteger(body.stockQuantity) ? body.stockQuantity : parseInt(String(body.stockQuantity ?? 0), 10),
        lowStockThreshold:
          body.lowStockThreshold != null
            ? parseInt(String(body.lowStockThreshold), 10)
            : 5,
        trackInventory: body.trackInventory !== false,
        isActive: body.isActive !== false,
        isB2bEligible: body.isB2bEligible === true,
      },
    });

    if (categoryIds.length > 0) {
      await prisma.productCategory.createMany({
        data: categoryIds.map((categoryId: string, i: number) => ({
          productId: product.id,
          categoryId,
          isPrimary: i === 0,
        })),
      });
    }
    if (imageUrls.length > 0) {
      await prisma.productImage.createMany({
        data: imageUrls.map((url: string, i: number) => ({
          productId: product.id,
          url,
          sortOrder: i,
        })),
      });
    }

    return NextResponse.json({ ok: true, id: product.id });
  } catch (e) {
    console.error('Product create error:', e);
    return NextResponse.json({ error: 'Ürün oluşturulamadı' }, { status: 500 });
  }
}
