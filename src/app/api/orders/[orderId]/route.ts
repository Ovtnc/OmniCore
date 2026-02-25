import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { OrderStatus } from '@prisma/client';

/** GET - Tek sipariş detayı */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: { select: { name: true, slug: true } },
        marketplaceConnection: { select: { id: true, platform: true } },
        items: {
          include: {
            product: {
              select: { id: true },
              include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
        b2bCustomer: { select: { code: true, name: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (e) {
    console.error('Order get error:', e);
    return NextResponse.json({ error: 'Sipariş getirilemedi' }, { status: 500 });
  }
}

/** PATCH - Sipariş güncelle (status, cargoTrackingNumber, cargoProvider, notes) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await req.json().catch(() => ({}));
    const { status, cargoTrackingNumber, cargoProvider, notes } = body as {
      status?: OrderStatus;
      cargoTrackingNumber?: string | null;
      cargoProvider?: string | null;
      notes?: string | null;
    };

    const validStatuses: OrderStatus[] = [
      'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED',
    ];
    const updateData: Record<string, unknown> = {};
    if (status && validStatuses.includes(status)) updateData.status = status;
    if (cargoTrackingNumber !== undefined) updateData.cargoTrackingNumber = cargoTrackingNumber === '' ? null : cargoTrackingNumber;
    if (cargoProvider !== undefined) updateData.cargoProvider = cargoProvider === '' ? null : cargoProvider;
    if (notes !== undefined) updateData.notes = notes === '' ? null : notes;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        store: { select: { name: true, slug: true } },
        items: { select: { id: true, sku: true, name: true, quantity: true, unitPrice: true, total: true } },
      },
    });
    return NextResponse.json(order);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 });
    }
    console.error('Order patch error:', e);
    return NextResponse.json({ error: 'Sipariş güncellenemedi' }, { status: 500 });
  }
}
