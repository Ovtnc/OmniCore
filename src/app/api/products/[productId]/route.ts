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

/** GET - Tek ürün (düzenleme formu için) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, alt: true, sortOrder: true } },
        categories: { select: { categoryId: true, isPrimary: true }, orderBy: { isPrimary: 'desc' } },
      },
    });
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }
    const p = {
      ...product,
      listPrice: Number(product.listPrice),
      salePrice: Number(product.salePrice),
      costPrice: product.costPrice != null ? Number(product.costPrice) : null,
      taxRate: Number(product.taxRate),
      weight: product.weight != null ? Number(product.weight) : null,
      categoryIds: product.categories.map((c) => c.categoryId),
      primaryCategoryId: product.categories.find((c) => c.isPrimary)?.categoryId ?? product.categories[0]?.categoryId,
      imageUrls: product.images.map((i) => i.url),
    };
    return NextResponse.json(p);
  } catch (e) {
    console.error('Product get error:', e);
    return NextResponse.json({ error: 'Ürün getirilemedi' }, { status: 500 });
  }
}

const updateBodySchema = {
  name: (v: unknown) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null),
  sku: (v: unknown) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null),
  slug: (v: unknown) => (typeof v === 'string' ? v.trim() || null : null),
  shortDescription: (v: unknown) => (typeof v === 'string' ? v.trim() || null : null),
  description: (v: unknown) => (typeof v === 'string' ? v.trim() || null : null),
  barcode: (v: unknown) => (typeof v === 'string' ? v.trim() || null : null),
  brand: (v: unknown) => (typeof v === 'string' ? v.trim() || null : null),
  listPrice: (v: unknown) => (typeof v === 'number' && v >= 0 ? v : typeof v === 'string' ? parseFloat(v) : null),
  salePrice: (v: unknown) => (typeof v === 'number' && v >= 0 ? v : typeof v === 'string' ? parseFloat(v) : null),
  costPrice: (v: unknown) =>
    v === null || v === undefined || v === '' ? null : typeof v === 'number' ? v : parseFloat(String(v)),
  taxRate: (v: unknown) => (typeof v === 'number' && v >= 0 ? v : typeof v === 'string' ? parseFloat(v) : null),
  stockQuantity: (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : parseInt(String(v), 10)),
  lowStockThreshold: (v: unknown) =>
    typeof v === 'number' && Number.isInteger(v) ? v : v === '' ? undefined : parseInt(String(v), 10),
  trackInventory: (v: unknown) => (typeof v === 'boolean' ? v : undefined),
  isActive: (v: unknown) => (typeof v === 'boolean' ? v : undefined),
  isB2bEligible: (v: unknown) => (typeof v === 'boolean' ? v : undefined),
  categoryIds: (v: unknown) => (Array.isArray(v) ? (v as string[]).filter((id) => typeof id === 'string') : null),
  imageUrls: (v: unknown) => (Array.isArray(v) ? (v as string[]).filter((u) => typeof u === 'string') : null),
  trendyolBrandId: (v: unknown) => {
    if (v === undefined) return undefined;
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    return Number.isNaN(n) || n < 1 ? null : n;
  },
  trendyolCategoryId: (v: unknown) => {
    if (v === undefined) return undefined;
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    return Number.isNaN(n) || n < 1 ? null : n;
  },
};

/** PATCH - Ürün güncelle */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, storeId: true, sku: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    const body = await req.json();
    const name = updateBodySchema.name(body.name) ?? existing.name;
    const sku = updateBodySchema.sku(body.sku) ?? existing.sku;
    let slug: string | null = updateBodySchema.slug(body.slug);
    if (slug === null) slug = slugify(name);

    if (sku !== existing.sku) {
      const duplicate = await prisma.product.findUnique({
        where: { storeId_sku: { storeId: existing.storeId, sku } },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'Bu mağazada bu SKU zaten kullanılıyor' }, { status: 400 });
      }
    }

    const listPrice = updateBodySchema.listPrice(body.listPrice);
    const salePrice = updateBodySchema.salePrice(body.salePrice);
    if (listPrice === null || listPrice < 0 || salePrice === null || salePrice < 0) {
      return NextResponse.json({ error: 'Liste ve satış fiyatı 0 veya üzeri olmalı' }, { status: 400 });
    }

    const categoryIds = updateBodySchema.categoryIds(body.categoryIds);
    const imageUrls = updateBodySchema.imageUrls(body.imageUrls);
    const trendyolBrandId = updateBodySchema.trendyolBrandId(body.trendyolBrandId);
    const trendyolCategoryId = updateBodySchema.trendyolCategoryId(body.trendyolCategoryId);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          name,
          sku,
          slug,
          shortDescription: updateBodySchema.shortDescription(body.shortDescription) ?? undefined,
          description: updateBodySchema.description(body.description) ?? undefined,
          barcode: updateBodySchema.barcode(body.barcode) ?? undefined,
          brand: updateBodySchema.brand(body.brand) ?? undefined,
          listPrice,
          salePrice,
          costPrice: updateBodySchema.costPrice(body.costPrice) ?? undefined,
          taxRate: updateBodySchema.taxRate(body.taxRate) ?? undefined,
          stockQuantity: updateBodySchema.stockQuantity(body.stockQuantity) ?? undefined,
          lowStockThreshold: updateBodySchema.lowStockThreshold(body.lowStockThreshold) ?? undefined,
          trackInventory: updateBodySchema.trackInventory(body.trackInventory) ?? undefined,
          isActive: updateBodySchema.isActive(body.isActive) ?? undefined,
          isB2bEligible: updateBodySchema.isB2bEligible(body.isB2bEligible) ?? undefined,
          ...(trendyolBrandId !== undefined ? { trendyolBrandId } : {}),
          ...(trendyolCategoryId !== undefined ? { trendyolCategoryId } : {}),
        },
      });

      if (categoryIds !== null) {
        await tx.productCategory.deleteMany({ where: { productId } });
        if (categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: categoryIds.map((categoryId, i) => ({
              productId,
              categoryId,
              isPrimary: i === 0,
            })),
          });
        }
      }

      if (imageUrls !== null) {
        await tx.productImage.deleteMany({ where: { productId } });
        if (imageUrls.length > 0) {
          await tx.productImage.createMany({
            data: imageUrls.map((url, i) => ({ productId, url, sortOrder: i })),
          });
        }
      }
    });

    return NextResponse.json({ ok: true, id: productId });
  } catch (e) {
    console.error('Product update error:', e);
    return NextResponse.json({ error: 'Ürün güncellenemedi' }, { status: 500 });
  }
}

/** DELETE - Ürün sil (siparişte kullanılmıyorsa). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, _count: { select: { orderItems: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }
    if (existing._count.orderItems > 0) {
      return NextResponse.json(
        { error: 'Bu ürün siparişlerde kullanıldığı için silinemez.' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.productCategory.deleteMany({ where: { productId } });
      await tx.productImage.deleteMany({ where: { productId } });
      await tx.product.delete({ where: { id: productId } });
    });

    return NextResponse.json({ ok: true, id: productId });
  } catch (e) {
    console.error('Product delete error:', e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
