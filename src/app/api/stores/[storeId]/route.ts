import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET - Tek mağaza detayı (ayarlar sayfası için) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        currency: true,
        timezone: true,
        locale: true,
        status: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }
    return NextResponse.json(store);
  } catch (e) {
    console.error('Store get error:', e);
    return NextResponse.json({ error: 'Mağaza getirilemedi' }, { status: 500 });
  }
}

/** PATCH - Mağaza güncelle (domain, timezone, locale, currency, settings) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await req.json().catch(() => ({}));
    const {
      name,
      domain,
      currency,
      timezone,
      locale,
      status,
      settings,
    } = body as {
      name?: string;
      domain?: string | null;
      currency?: string;
      timezone?: string;
      locale?: string;
      status?: string;
      settings?: Record<string, unknown>;
    };

    const updateData: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
    if (domain !== undefined) updateData.domain = domain === '' ? null : domain;
    if (typeof currency === 'string') updateData.currency = currency;
    if (typeof timezone === 'string') updateData.timezone = timezone;
    if (typeof locale === 'string') updateData.locale = locale;
    if (typeof status === 'string' && ['ACTIVE', 'SUSPENDED', 'TRIAL'].includes(status)) updateData.status = status;
    if (settings !== undefined && (settings === null || typeof settings === 'object')) updateData.settings = settings;

    const store = await prisma.store.update({
      where: { id: storeId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        currency: true,
        timezone: true,
        locale: true,
        status: true,
        settings: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(store);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }
    console.error('Store patch error:', e);
    return NextResponse.json({ error: 'Mağaza güncellenemedi' }, { status: 500 });
  }
}

/** DELETE - Mağazayı sil. FK sırası: Job.orderId null → OrderItem → Order → Store (cascade geri kalanı). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });
    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }

    const orderIds = await prisma.order.findMany({
      where: { storeId },
      select: { id: true },
    }).then((rows) => rows.map((r) => r.id));

    await prisma.$transaction([
      prisma.job.updateMany({
        where: { orderId: { in: orderIds } },
        data: { orderId: null },
      }),
      prisma.orderItem.deleteMany({
        where: { orderId: { in: orderIds } },
      }),
      prisma.order.deleteMany({
        where: { storeId },
      }),
      prisma.store.delete({ where: { id: storeId } }),
    ]);

    return NextResponse.json({ ok: true, message: 'Mağaza silindi' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Store delete error:', e);
    return NextResponse.json({ error: msg || 'Mağaza silinemedi' }, { status: 500 });
  }
}
