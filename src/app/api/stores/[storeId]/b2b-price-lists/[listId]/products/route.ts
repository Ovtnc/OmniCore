import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** POST - Fiyat listesine ürün ekle */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; listId: string }> }
) {
  try {
    const { storeId, listId } = await params;
    const list = await prisma.b2BPriceList.findFirst({
      where: { id: listId, storeId },
    });
    if (!list) {
      return NextResponse.json({ error: 'Fiyat listesi bulunamadı' }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const { productId, price, minQuantity } = body as {
      productId?: string;
      price?: number;
      minQuantity?: number;
    };
    if (!productId?.trim()) {
      return NextResponse.json({ error: 'Ürün seçin' }, { status: 400 });
    }
    const priceVal = typeof price === 'number' && price >= 0 ? price : parseFloat(String(price ?? 0)) || 0;
    const minQty = typeof minQuantity === 'number' && minQuantity >= 0 ? minQuantity : 1;
    await prisma.b2BPriceListProduct.upsert({
      where: {
        priceListId_productId: { priceListId: listId, productId: productId.trim() },
      },
      create: {
        priceListId: listId,
        productId: productId.trim(),
        price: priceVal,
        minQuantity: minQty,
      },
      update: { price: priceVal, minQuantity: minQty },
    });
    const item = await prisma.b2BPriceListProduct.findUnique({
      where: {
        priceListId_productId: { priceListId: listId, productId: productId.trim() },
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
      },
    });
    return NextResponse.json(item);
  } catch (e) {
    console.error('B2B price list product add error:', e);
    return NextResponse.json({ error: 'Ürün eklenemedi' }, { status: 500 });
  }
}

/** DELETE - Fiyat listesinden ürün çıkar (query: productId) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; listId: string }> }
) {
  try {
    const { storeId, listId } = await params;
    const list = await prisma.b2BPriceList.findFirst({
      where: { id: listId, storeId },
    });
    if (!list) {
      return NextResponse.json({ error: 'Fiyat listesi bulunamadı' }, { status: 404 });
    }
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId gerekli' }, { status: 400 });
    }
    await prisma.b2BPriceListProduct.deleteMany({
      where: { priceListId: listId, productId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('B2B price list product delete error:', e);
    return NextResponse.json({ error: 'Ürün çıkarılamadı' }, { status: 500 });
  }
}
