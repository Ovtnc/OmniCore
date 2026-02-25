import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** PATCH - B2B müşteri güncelle */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; customerId: string }> }
) {
  try {
    const { storeId, customerId } = await params;
    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);
    const num = (v: unknown) => (typeof v === 'number' ? v : undefined);
    if (body.code !== undefined) data.code = str(body.code) ?? undefined;
    if (body.name !== undefined) data.name = str(body.name) ?? undefined;
    if (body.taxNumber !== undefined) data.taxNumber = str(body.taxNumber) || null;
    if (body.taxOffice !== undefined) data.taxOffice = str(body.taxOffice) || null;
    if (body.address !== undefined) data.address = str(body.address) || null;
    if (body.city !== undefined) data.city = str(body.city) || null;
    if (body.district !== undefined) data.district = str(body.district) || null;
    if (body.country !== undefined) data.country = str(body.country) || 'TR';
    if (body.email !== undefined) data.email = str(body.email) || null;
    if (body.phone !== undefined) data.phone = str(body.phone) || null;
    if (body.paymentTermDays !== undefined) data.paymentTermDays = num(body.paymentTermDays) ?? 0;
    if (body.creditLimit !== undefined) data.creditLimit = body.creditLimit === null ? null : num(body.creditLimit);
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.notes !== undefined) data.notes = str(body.notes) || null;

    const result = await prisma.b2BCustomer.updateMany({
      where: { id: customerId, storeId },
      data: data as never,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 });
    }
    const updated = await prisma.b2BCustomer.findUnique({
      where: { id: customerId },
      include: { priceList: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('B2B customer patch error:', e);
    return NextResponse.json({ error: 'B2B müşteri güncellenemedi' }, { status: 500 });
  }
}

/** DELETE - B2B müşteri sil */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; customerId: string }> }
) {
  try {
    const { storeId, customerId } = await params;
    const result = await prisma.b2BCustomer.deleteMany({
      where: { id: customerId, storeId },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('B2B customer delete error:', e);
    return NextResponse.json({ error: 'B2B müşteri silinemedi' }, { status: 500 });
  }
}
