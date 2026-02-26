import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBrandLabel } from '@/lib/brands';

const EXCLUDED_ORDER_STATUSES = ['CANCELLED', 'REFUNDED'] as const;

type Period = 'day' | 'week' | 'month';

function getDateRange(period: Period): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);

  if (period === 'day') {
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    from.setDate(from.getDate() - 12 * 7);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setMonth(from.getMonth() - 12);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

function groupKey(date: Date, period: Period): string {
  if (period === 'day') {
    return date.toISOString().slice(0, 10);
  }
  if (period === 'week') {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().slice(0, 10);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

/** GET - Analitik verileri (ciro, sipariş, ürün, platform, düşük stok) */
export async function GET(req: NextRequest) {
  try {
    const period = (req.nextUrl.searchParams.get('period') || 'day') as Period;
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json({ error: 'Geçersiz period' }, { status: 400 });
    }

    const { from, to } = getDateRange(period);

    const [orders, orderItemsWithProduct, products, lowStockProducts, lowStockCount] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: { notIn: [...EXCLUDED_ORDER_STATUSES] },
          createdAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          total: true,
          createdAt: true,
          platform: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            status: { notIn: [...EXCLUDED_ORDER_STATUSES] },
            createdAt: { gte: from, lte: to },
          },
        },
        select: {
          productId: true,
          sku: true,
          name: true,
          quantity: true,
          total: true,
        },
      }),
      prisma.product.count(),
      prisma.product.findMany({
        where: { stockQuantity: { lte: 10 } },
        select: {
          id: true,
          name: true,
          sku: true,
          stockQuantity: true,
          listPrice: true,
          salePrice: true,
        },
        orderBy: { stockQuantity: 'asc' },
      }),
      prisma.product.count({ where: { stockQuantity: { lte: 5 } } }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const orderCount = orders.length;

    const revenueByKey: Record<string, { revenue: number; count: number }> = {};
    for (const o of orders) {
      const key = groupKey(o.createdAt, period);
      if (!revenueByKey[key]) revenueByKey[key] = { revenue: 0, count: 0 };
      revenueByKey[key].revenue += Number(o.total);
      revenueByKey[key].count += 1;
    }
    const revenueTimeSeries = Object.entries(revenueByKey)
      .map(([date, v]) => ({ date, revenue: v.revenue, count: v.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byProductId: Record<
      string,
      { productId: string; name: string; sku: string; quantitySold: number; revenue: number }
    > = {};
    for (const item of orderItemsWithProduct) {
      const id = item.productId;
      if (!byProductId[id]) {
        byProductId[id] = {
          productId: id,
          name: item.name,
          sku: item.sku,
          quantitySold: 0,
          revenue: 0,
        };
      }
      byProductId[id].quantitySold += item.quantity;
      byProductId[id].revenue += Number(item.total);
    }
    const topProducts = Object.values(byProductId)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    const byPlatform: Record<string, { count: number; revenue: number }> = {};
    for (const o of orders) {
      const platform = o.platform ?? 'OTHER';
      if (!byPlatform[platform]) byPlatform[platform] = { count: 0, revenue: 0 };
      byPlatform[platform].count += 1;
      byPlatform[platform].revenue += Number(o.total);
    }
    const platformArray = Object.entries(byPlatform).map(([platform, v]) => ({
      platform,
      label: getBrandLabel(platform),
      count: v.count,
      revenue: v.revenue,
    }));


    const lowStockList = lowStockProducts.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stockQuantity: p.stockQuantity,
      listPrice: Number(p.listPrice),
      salePrice: Number(p.salePrice),
    }));

    return NextResponse.json({
      summary: {
        orderCount,
        totalRevenue,
        productCount: products,
        lowStockCount,
      },
      revenueTimeSeries,
      topProducts,
      lowStockProducts: lowStockList,
      byPlatform: platformArray,
    });
  } catch (e) {
    console.error('Analytics API error:', e);
    return NextResponse.json(
      { error: 'Analitik veriler yüklenemedi' },
      { status: 500 }
    );
  }
}
