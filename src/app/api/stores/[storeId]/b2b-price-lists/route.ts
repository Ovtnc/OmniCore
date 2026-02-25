import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET - B2B fiyat listeleri */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const list = await prisma.b2BPriceList.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        _count: { select: { products: true } },
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('B2B price lists list error:', e);
    return NextResponse.json({ error: 'Fiyat listeleri listelenemedi' }, { status: 500 });
  }
}

/** POST - Yeni B2B fiyat listesi (müşteriye bağlı) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await req.json().catch(() => ({}));
    const { b2bCustomerId, name, currency, isDefault } = body as {
      b2bCustomerId?: string;
      name?: string;
      currency?: string;
      isDefault?: boolean;
    };
    if (!b2bCustomerId?.trim()) {
      return NextResponse.json({ error: 'B2B müşteri seçin' }, { status: 400 });
    }
    const customer = await prisma.b2BCustomer.findFirst({
      where: { id: b2bCustomerId, storeId },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 });
    }
    const existingList = await prisma.b2BPriceList.findUnique({
      where: { b2bCustomerId: customer.id },
    });
    if (existingList) {
      return NextResponse.json({ error: 'Bu müşteri için zaten fiyat listesi var' }, { status: 400 });
    }
    const list = await prisma.b2BPriceList.create({
      data: {
        storeId,
        b2bCustomerId: customer.id,
        name: (name && String(name).trim()) || `${customer.name} fiyat listesi`,
        currency: (currency && String(currency).trim()) || 'TRY',
        isDefault: !!isDefault,
      },
      include: {
        customer: { select: { id: true, code: true, name: true } },
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('B2B price list create error:', e);
    return NextResponse.json({ error: 'Fiyat listesi eklenemedi' }, { status: 500 });
  }
}
