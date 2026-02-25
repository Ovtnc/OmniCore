import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET - Tek fiyat listesi + ürünler */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; listId: string }> }
) {
  try {
    const { storeId, listId } = await params;
    const list = await prisma.b2BPriceList.findFirst({
      where: { id: listId, storeId },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        products: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
          },
        },
      },
    });
    if (!list) {
      return NextResponse.json({ error: 'Fiyat listesi bulunamadı' }, { status: 404 });
    }
    return NextResponse.json(list);
  } catch (e) {
    console.error('B2B price list get error:', e);
    return NextResponse.json({ error: 'Fiyat listesi getirilemedi' }, { status: 500 });
  }
}

/** PATCH - Fiyat listesi güncelle */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; listId: string }> }
) {
  try {
    const { storeId, listId } = await params;
    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim() || undefined;
    if (body.currency !== undefined) data.currency = String(body.currency).trim() || 'TRY';
    if (body.isDefault !== undefined) data.isDefault = !!body.isDefault;

    const result = await prisma.b2BPriceList.updateMany({
      where: { id: listId, storeId },
      data: data as never,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Fiyat listesi bulunamadı' }, { status: 404 });
    }
    const updated = await prisma.b2BPriceList.findUnique({
      where: { id: listId },
      include: { customer: { select: { id: true, code: true, name: true } } },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('B2B price list patch error:', e);
    return NextResponse.json({ error: 'Fiyat listesi güncellenemedi' }, { status: 500 });
  }
}

/** DELETE - Fiyat listesi sil */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; listId: string }> }
) {
  try {
    const { storeId, listId } = await params;
    const result = await prisma.b2BPriceList.deleteMany({
      where: { id: listId, storeId },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Fiyat listesi bulunamadı' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('B2B price list delete error:', e);
    return NextResponse.json({ error: 'Fiyat listesi silinemedi' }, { status: 500 });
  }
}
