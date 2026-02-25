import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { OrderStatus } from '@prisma/client';

/** GET - Sipariş listesi (storeId, status, sayfalama) */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status') as OrderStatus | null;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: { storeId?: string; status?: OrderStatus } = {};
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          store: { select: { name: true, slug: true } },
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
