/**
 * GET - Seçilen kategorideki (veya "Tüm ürünler") aktif ürün ID'leri ve barkod uyarısı
 * ?categoryId=xxx | categoryId=all
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PLATFORM_LABELS: Record<string, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  AMAZON: 'Amazon',
  N11: 'N11',
  SHOPIFY: 'Shopify',
  WOOCOMMERCE: 'WooCommerce',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') ?? '';

    if (!storeId) {
      return NextResponse.json({ error: 'storeId gerekli' }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });
    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }

    const isAll = !categoryId || categoryId === 'all';
    const products = await prisma.product.findMany({
      where: isAll
        ? { storeId, isActive: true }
        : {
            storeId,
            isActive: true,
            categories: { some: { categoryId } },
          },
      select: { id: true, barcode: true },
    });

    const productIds = products.map((p) => p.id);
    const missingBarcodeCount = products.filter((p) => !p.barcode || String(p.barcode).trim() === '').length;

    const connections = await prisma.marketplaceConnection.findMany({
      where: { storeId },
      select: { id: true, platform: true, isActive: true },
    });

    return NextResponse.json({
      productIds,
      total: productIds.length,
      missingBarcodeCount,
      connections: connections.map((c) => ({
        id: c.id,
        platform: c.platform,
        label: PLATFORM_LABELS[c.platform] ?? c.platform,
        isActive: c.isActive,
      })),
    });
  } catch (e) {
    console.error('category-products error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Yüklenemedi' },
      { status: 500 }
    );
  }
}
