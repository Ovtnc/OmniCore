import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { OrderStatus, PaymentStatus, MarketplacePlatform } from '@prisma/client';

/** GET - Sipariş listesi (storeId, status, platform, paymentStatus, dateFrom, dateTo, sayfalama) */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status') as OrderStatus | null;
    const platform = searchParams.get('platform');
    const paymentStatus = searchParams.get('paymentStatus') as PaymentStatus | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: {
      storeId?: string;
      status?: OrderStatus;
      platform?: MarketplacePlatform;
      paymentStatus?: PaymentStatus;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;
    if (platform) where.platform = platform as MarketplacePlatform;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        d.setHours(0, 0, 0, 0);
        where.createdAt.gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          store: { select: { name: true, slug: true } },
          marketplaceConnection: { select: { id: true, platform: true } },
          items: { select: { id: true, sku: true, name: true, quantity: true, unitPrice: true, total: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.error('Orders list error:', e);
    return NextResponse.json({ error: 'Siparişler listelenemedi' }, { status: 500 });
  }
}
