/**
 * POST - Seçilen ürünleri kalıcı Product tablosuna aktar, marketplace-sync kuyruğuna ekle.
 * Body: { batchId: string, productIds: string[] } (productIds = XmlImportItem id'leri)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { marketplaceSyncQueue } from '@/lib/queue';
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
    let created = 0;
    const imageUrlsArr = (urls: unknown): string[] =>
      Array.isArray(urls) ? urls.filter((u): u is string => typeof u === 'string') : [];

    for (const item of toImport) {
      const product = await prisma.product.upsert({
        where: { storeId_sku: { storeId, sku: item.sku } },
        update: {
          name: item.name,
          description: item.description,
          shortDescription: item.shortDescription,
          barcode: item.barcode,
          brand: item.brand,
          listPrice: item.listPrice,
          salePrice: item.salePrice,
          stockQuantity: item.stockQuantity,
          updatedAt: new Date(),
          ...(item.attributes && typeof item.attributes === 'object' && Object.keys(item.attributes as object).length > 0
            ? { attributes: item.attributes as object }
            : {}),
        },
        create: {
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
          ...(item.attributes && typeof item.attributes === 'object' && Object.keys(item.attributes as object).length > 0
            ? { attributes: item.attributes as object }
            : {}),
        },
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
        const categoryId = await resolveOrCreateCategory(storeId, item.categoryName.trim());
        if (categoryId) {
          await setProductCategory(product.id, categoryId, true);
        }
      }

      await marketplaceSyncQueue.add(
        `sync-${product.id}-${Date.now()}`,
        {
          storeId,
          type: 'product',
          productId: product.id,
          platform: '',
          payload: {},
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );
      created++;
    }

    await prisma.xmlImportItem.deleteMany({ where: { batchId } });
    await prisma.xmlImportBatch.update({
      where: { id: batchId },
      data: { status: 'COMPLETED' },
    });

    return NextResponse.json({
      ok: true,
      imported: created,
      message: `${created} ürün sisteme aktarıldı ve pazaryeri kuyruğuna eklendi.`,
    });
  } catch (e) {
    console.error('xml-import confirm error:', e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
