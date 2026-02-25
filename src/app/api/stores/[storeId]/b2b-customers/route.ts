import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET - B2B müşteri listesi */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const list = await prisma.b2BCustomer.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
      include: {
        priceList: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('B2B customers list error:', e);
    return NextResponse.json({ error: 'B2B müşterileri listelenemedi' }, { status: 500 });
  }
}

/** POST - Yeni B2B müşteri */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await req.json().catch(() => ({}));
    const {
      code,
      name,
      taxNumber,
      taxOffice,
      address,
      city,
      district,
      country,
      email,
      phone,
      paymentTermDays,
      creditLimit,
      notes,
    } = body as {
      code?: string;
      name?: string;
      taxNumber?: string;
      taxOffice?: string;
      address?: string;
      city?: string;
      district?: string;
      country?: string;
      email?: string;
      phone?: string;
      paymentTermDays?: number;
      creditLimit?: number;
      notes?: string;
    };
    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'Cari kod ve ad gerekli' }, { status: 400 });
    }
    const existing = await prisma.b2BCustomer.findFirst({
      where: { storeId, code: code.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: 'Bu cari kod zaten kullanılıyor' }, { status: 400 });
    }
    const customer = await prisma.b2BCustomer.create({
      data: {
        storeId,
        code: code.trim(),
        name: name.trim(),
        taxNumber: taxNumber?.trim() || null,
        taxOffice: taxOffice?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        district: district?.trim() || null,
        country: country?.trim() || 'TR',
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        paymentTermDays: paymentTermDays ?? 0,
        creditLimit: creditLimit != null ? creditLimit : null,
        notes: notes?.trim() || null,
      },
    });
    return NextResponse.json(customer);
  } catch (e) {
    console.error('B2B customer create error:', e);
    return NextResponse.json({ error: 'B2B müşteri eklenemedi' }, { status: 500 });
  }
}
