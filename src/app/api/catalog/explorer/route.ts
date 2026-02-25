/**
 * GET - Katalog gezgini: Mağazalar -> Kategoriler -> Ürünler hiyerarşisi
 * ?storeId= &categoryId= (opsiyonel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId') ?? '';
    const categoryId = searchParams.get('categoryId') ?? '';

    if (!storeId) {
      const stores = await prisma.store.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { products: true } },
        },
      });
      return NextResponse.json({
        view: 'stores',
        stores: stores.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          productCount: s._count.products,
        })),
      });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, slug: true },
    });
    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }

    if (!categoryId || categoryId === 'all') {
      if (categoryId === 'all') {
        const products = await prisma.product.findMany({
          where: { storeId },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            storeId: true,
            sku: true,
            name: true,
            slug: true,
            salePrice: true,
            listPrice: true,
            stockQuantity: true,
            isActive: true,
            brand: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
            marketplaceListings: {
              select: { connection: { select: { platform: true } } },
            },
          },
        });
        const rows = products.map((p) => ({
          id: p.id,
          storeId: p.storeId,
          sku: p.sku,
          name: p.name,
          slug: p.slug,
          salePrice: Number(p.salePrice),
          listPrice: Number(p.listPrice),
          stockQuantity: p.stockQuantity,
          isActive: p.isActive,
          brand: p.brand,
          imageUrl: p.images[0]?.url ?? null,
          platforms: [...new Set(p.marketplaceListings.map((l) => l.connection.platform))],
        }));
        return NextResponse.json({
          view: 'products',
          store: { id: store.id, name: store.name, slug: store.slug },
          category: { id: 'all', name: 'Tüm ürünler', slug: 'all' },
          products: rows,
        });
      }

      const categories = await prisma.category.findMany({
        where: { storeId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { products: true } },
        },
      });
      const activeCounts = await Promise.all(
        categories.map((c) =>
          prisma.productCategory.count({
            where: {
              categoryId: c.id,
              product: { isActive: true },
            },
          })
        )
      );
      const storeProductCount = await prisma.product.count({
        where: { storeId },
      });
      return NextResponse.json({
        view: 'categories',
        store: { id: store.id, name: store.name, slug: store.slug },
        storeProductCount,
        categories: categories.map((c, i) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          productCount: activeCounts[i] ?? c._count.products,
        })),
      });
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, storeId },
      select: { id: true, name: true, slug: true },
    });
    if (!category) {
      return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: {
        storeId,
        categories: { some: { categoryId } },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        storeId: true,
        sku: true,
        name: true,
        slug: true,
        salePrice: true,
        listPrice: true,
        stockQuantity: true,
        isActive: true,
        brand: true,
        images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
        marketplaceListings: {
          select: { connection: { select: { platform: true } } },
        },
      },
    });

    const rows = products.map((p) => ({
      id: p.id,
      storeId: p.storeId,
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      salePrice: Number(p.salePrice),
      listPrice: Number(p.listPrice),
      stockQuantity: p.stockQuantity,
      isActive: p.isActive,
      brand: p.brand,
      imageUrl: p.images[0]?.url ?? null,
      platforms: [...new Set(p.marketplaceListings.map((l) => l.connection.platform))],
    }));

    return NextResponse.json({
      view: 'products',
      store: { id: store.id, name: store.name, slug: store.slug },
      category: { id: category.id, name: category.name, slug: category.slug },
      products: rows,
    });
  } catch (e) {
    console.error('Catalog explorer error:', e);
    return NextResponse.json(
      { error: 'Katalog yüklenemedi' },
      { status: 500 }
    );
  }
}
