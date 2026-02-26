/**
 * POST - Seçilen ürünleri kalıcı Product tablosuna aktar.
 * Pazaryeri gönderimi bu adımda yapılmaz; kullanıcı Quick Sync'ten manuel başlatır.
 * Body: { batchId: string, productIds: string[] } (productIds = XmlImportItem id'leri)
 */
import { NextRequest, NextResponse } from 'next/server';
import { ListingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveOrCreateCategory, setProductCategory } from '@/lib/category-resolve';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchId = typeof body.batchId === 'string' ? body.batchId.trim() : '';
    const productIds = Array.isArray(body.productIds) ? (body.productIds as string[]) : [];

    if (!batchId) {
      return NextResponse.json({ error: 'batchId gerekli' }, { status: 400 });
    }
    if (productIds.length === 0) {
      return NextResponse.json({ error: 'En az bir ürün seçin (productIds)' }, { status: 400 });
    }

    const batch = await prisma.xmlImportBatch.findUnique({
      where: { id: batchId },
      include: { items: true },
    });
    if (!batch) {
      return NextResponse.json({ error: 'Batch bulunamadı' }, { status: 404 });
    }
    if (batch.status !== 'PENDING' && batch.status !== 'IMPORTING') {
      return NextResponse.json({ error: 'Bu batch zaten işlendi veya iptal edildi' }, { status: 400 });
    }

    const toImport = batch.items.filter((i) => productIds.includes(i.id));
    if (toImport.length === 0) {
      return NextResponse.json({ error: 'Seçilen ürünler bu batch\'e ait değil' }, { status: 400 });
    }

    const storeId = batch.storeId;
    const activeConnections = await prisma.marketplaceConnection.findMany({
      where: { storeId, isActive: true },
      select: { id: true },
    });
    let created = 0;
    const imageUrlsArr = (urls: unknown): string[] =>
      Array.isArray(urls) ? urls.filter((u): u is string => typeof u === 'string') : [];

    for (const item of toImport) {
      const updatePayload = {
        name: item.name,
        description: item.description,
        shortDescription: item.shortDescription,
        barcode: item.barcode,
        brand: item.brand,
        listPrice: item.listPrice,
        salePrice: item.salePrice,
        stockQuantity: item.stockQuantity,
        updatedAt: new Date(),
        ...(item.trendyolBrandId != null && item.trendyolBrandId > 0 ? { trendyolBrandId: item.trendyolBrandId } : {}),
        ...(item.trendyolCategoryId != null && item.trendyolCategoryId > 0 ? { trendyolCategoryId: item.trendyolCategoryId } : {}),
        ...(item.attributes && typeof item.attributes === 'object' && Object.keys(item.attributes as object).length > 0
          ? { attributes: item.attributes as object }
          : {}),
      };
      const createPayload = {
        storeId: item.storeId,
        sku: item.sku,
        name: item.name,
        slug: item.slug,
        description: item.description,
        shortDescription: item.shortDescription,
        barcode: item.barcode,
        brand: item.brand,
        listPrice: item.listPrice,
        salePrice: item.salePrice,
        stockQuantity: item.stockQuantity,
        ...(item.trendyolBrandId != null && item.trendyolBrandId > 0 ? { trendyolBrandId: item.trendyolBrandId } : {}),
        ...(item.trendyolCategoryId != null && item.trendyolCategoryId > 0 ? { trendyolCategoryId: item.trendyolCategoryId } : {}),
        ...(item.attributes && typeof item.attributes === 'object' && Object.keys(item.attributes as object).length > 0
          ? { attributes: item.attributes as object }
          : {}),
      };
      const product = await prisma.product.upsert({
        where: { storeId_sku: { storeId, sku: item.sku } },
        update: updatePayload,
        create: createPayload,
      });

      const urls = imageUrlsArr(item.imageUrls);
      if (urls.length > 0) {
        await prisma.productImage.deleteMany({ where: { productId: product.id } });
        await prisma.productImage.createMany({
          data: urls.slice(0, 10).map((url, sortOrder) => ({
            productId: product.id,
            url,
            alt: item.name,
            sortOrder,
          })),
        });
      }

      if (item.categoryName?.trim()) {
        const categoryId = await resolveOrCreateCategory(storeId, item.categoryName.trim(), null);
        if (categoryId) {
          await setProductCategory(product.id, categoryId, true);
        }
      }

      // Kullanıcı manuel göndereceği için ürünü Quick Sync adayına düşür.
      for (const conn of activeConnections) {
        await prisma.marketplaceListing.upsert({
          where: { connectionId_productId: { connectionId: conn.id, productId: product.id } },
          create: {
            storeId,
            connectionId: conn.id,
            productId: product.id,
            externalSku: product.sku ?? null,
            listPrice: product.listPrice,
            salePrice: product.salePrice,
            stockQuantity: product.stockQuantity,
            status: ListingStatus.PENDING,
            lastSyncAt: null,
            syncError: null,
          },
          update: {
            externalSku: product.sku ?? null,
            listPrice: product.listPrice,
            salePrice: product.salePrice,
            stockQuantity: product.stockQuantity,
            status: ListingStatus.PENDING,
            syncError: null,
          },
        });
      }
      created++;
    }

    const importedIds = toImport.map((i) => i.id);
    await prisma.xmlImportItem.deleteMany({ where: { id: { in: importedIds } } });
    const remaining = await prisma.xmlImportItem.count({ where: { batchId } });
    if (remaining === 0) {
      await prisma.xmlImportBatch.update({
        where: { id: batchId },
        data: { status: 'COMPLETED' },
      });
    }

    return NextResponse.json({
      ok: true,
      imported: created,
      message: `${created} ürün sisteme aktarıldı. Pazaryerine göndermek için Hızlı Senkronizasyon'u kullanın.`,
    });
  } catch (e) {
    console.error('xml-import confirm error:', e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
