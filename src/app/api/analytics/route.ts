import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PLATFORM_LABEL: Record<string, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  AMAZON: 'Amazon',
  N11: 'N11',
  SHOPIFY: 'Shopify',
  WOOCOMMERCE: 'WooCommerce',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? 'day'; // day | week | month

  try {
    const validPeriod = period === 'week' ? 'week' : period === 'month' ? 'month' : 'day';
    const revenueTimeSeries = await getRevenueTimeSeries(validPeriod);
    const [topProducts, lowStockProducts, byPlatform, summary] = await Promise.all([
      getTopProducts(15),
      getLowStockProducts(15),
      getOrdersByPlatform(),
      getSummary(),
    ]);

    return NextResponse.json({
      revenueTimeSeries,
      topProducts,
      lowStockProducts,
      byPlatform: byPlatform.map((p) => ({
        platform: p.platform ?? 'DİĞER',
        label: PLATFORM_LABEL[p.platform ?? ''] ?? p.platform ?? 'Diğer',
        count: p._count,
        revenue: Number(p._sum.total ?? 0),
      })),
      summary,
    });
  } catch (e) {
    console.error('Analytics API error:', e);
    return NextResponse.json(
      {
        revenueTimeSeries: [],
        topProducts: [],
        lowStockProducts: [],
        byPlatform: [],
        summary: {
          orderCount: 0,
          totalRevenue: 0,
          productCount: 0,
          lowStockCount: 0,
        },
      },
      { status: 200 }
    );
  }
}

async function getRevenueTimeSeries(period: 'day' | 'week' | 'month') {
  const intervalDays = period === 'month' ? 365 : period === 'week' ? 84 : 30;
  const trunc =
    period === 'month'
      ? "date_trunc('month', o.\"createdAt\")::date"
      : period === 'week'
        ? "date_trunc('week', o.\"createdAt\")::date"
        : "date_trunc('day', o.\"createdAt\")::date";

  type Row = { date: Date; revenue: string; count: string };
  let rows: Row[] = [];
  try {
    rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT ${trunc} as date, COALESCE(SUM(o.total), 0)::decimal as revenue, COUNT(*)::int as count
       FROM "Order" o
       WHERE o.status NOT IN ('CANCELLED', 'REFUNDED')
         AND o."createdAt" >= (CURRENT_DATE - (${intervalDays} * INTERVAL '1 day'))
       GROUP BY 1 ORDER BY 1`
    );
  } catch {
    rows = [];
  }

  if (rows.length === 0) {
    const points: { date: string; revenue: number; count: number }[] = [];
    const now = new Date();
    const daysBack = period === 'month' ? 365 : period === 'week' ? 84 : 30;
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      let end = new Date(d);
      if (period === 'month') end.setMonth(end.getMonth() + 1);
      else if (period === 'week') end.setDate(end.getDate() + 7);
      else end.setDate(end.getDate() + 1);

      const agg = await prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          createdAt: { gte: d, lt: end },
        },
      });
      points.push({
        date: d.toISOString().slice(0, 10),
        revenue: Number(agg._sum.total ?? 0),
        count: agg._count,
      });
    }
    return period === 'month' ? points.filter((_, i) => i % 30 === 0).slice(-12) : points;
  }

  return rows.map((r) => ({
    date: (typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0, 10)).slice(0, 10),
    revenue: Number(r.revenue),
    count: Number(r.count),
  }));
}

async function getTopProducts(limit: number) {
  const items = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: { total: true, quantity: true },
    where: {
      order: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    },
  });

  if (items.length === 0) return [];
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true },
  });
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  return items
    .map((i) => ({
      productId: i.productId,
      name: byId[i.productId]?.name ?? '–',
      sku: byId[i.productId]?.sku ?? '–',
      quantitySold: Number(i._sum.quantity ?? 0),
      revenue: Number(i._sum.total ?? 0),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

async function getLowStockProducts(limit: number) {
  const products = await prisma.product.findMany({
    where: {
      trackInventory: true,
      stockQuantity: { lte: 10 },
    },
    orderBy: { stockQuantity: 'asc' },
    take: limit,
    select: {
      id: true,
      name: true,
      sku: true,
      stockQuantity: true,
      listPrice: true,
      salePrice: true,
    },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stockQuantity: p.stockQuantity,
    listPrice: Number(p.listPrice ?? 0),
    salePrice: Number(p.salePrice ?? 0),
  }));
}

async function getOrdersByPlatform() {
  const result = await prisma.order.groupBy({
    by: ['platform'],
    _count: true,
    _sum: { total: true },
    where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
  });
  return result;
}

async function getSummary() {
  const [orderCount, orderTotalRevenue, productCount, lowStockCount] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    }),
    prisma.product.count(),
    prisma.product.count({
      where: {
        trackInventory: true,
        stockQuantity: { lte: 5 },
      },
    }),
  ]);
  return {
    orderCount,
    totalRevenue: Number(orderTotalRevenue._sum.total ?? 0),
    productCount,
    lowStockCount,
  };
}
