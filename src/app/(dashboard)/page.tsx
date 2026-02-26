import { Suspense } from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DashboardView } from '../../components/dashboard/DashboardView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function serializeOrderForClient<T extends { subtotal?: unknown; taxTotal?: unknown; shippingCost?: unknown; discountTotal?: unknown; total?: unknown; items?: Array<{ unitPrice?: unknown; taxRate?: unknown; taxAmount?: unknown; total?: unknown }> }>(order: T): T {
  const o = { ...order } as Record<string, unknown>;
  if (typeof o.subtotal !== 'undefined') o.subtotal = Number(o.subtotal);
  if (typeof o.taxTotal !== 'undefined') o.taxTotal = Number(o.taxTotal);
  if (typeof o.shippingCost !== 'undefined') o.shippingCost = Number(o.shippingCost);
  if (typeof o.discountTotal !== 'undefined') o.discountTotal = Number(o.discountTotal);
  if (typeof o.total !== 'undefined') o.total = Number(o.total);
  if (Array.isArray(o.items)) {
    o.items = (o.items as Array<Record<string, unknown>>).map((item) => ({
      ...item,
      unitPrice: typeof item.unitPrice !== 'undefined' ? Number(item.unitPrice) : item.unitPrice,
      taxRate: typeof item.taxRate !== 'undefined' ? Number(item.taxRate) : item.taxRate,
      taxAmount: typeof item.taxAmount !== 'undefined' ? Number(item.taxAmount) : item.taxAmount,
      total: typeof item.total !== 'undefined' ? Number(item.total) : item.total,
    }));
  }
  return o as T;
}

async function getDashboardData() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  try {
    const [
      orderCount,
      productCount,
      storeCount,
      recentOrdersRaw,
      marketplaceCount,
      accountingCount,
      orderCountLast7,
      orderCountPrev7,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.product.count(),
      prisma.store.count(),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { name: true, slug: true } },
          items: { take: 2 },
        },
      }),
      prisma.marketplaceConnection.count({ where: { isActive: true } }),
      prisma.accountingIntegration.count({ where: { isActive: true } }),
      prisma.order.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.order.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    ]);

    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    const recentOrders = recentOrdersRaw.map(serializeOrderForClient);
    const orderTrendPercent =
      orderCountPrev7 > 0
        ? Math.round(((orderCountLast7 - orderCountPrev7) / orderCountPrev7) * 100)
        : 0;

    return {
      orderCount,
      productCount,
      storeCount,
      recentOrders,
      marketplaceCount,
      accountingCount,
      ordersByStatus,
      orderTrendPercent,
    };
  } catch {
    return {
      orderCount: 0,
      productCount: 0,
      storeCount: 0,
      recentOrders: [],
      marketplaceCount: 0,
      accountingCount: 0,
      ordersByStatus: [] as { status: string; _count: number }[],
      orderTrendPercent: 0,
    };
  }
}

export default async function DashboardPage() {
  const [data, session] = await Promise.all([getDashboardData(), auth()]);
  const pendingOrders =
    data.ordersByStatus.find((s) => s.status === 'PENDING')?._count ?? 0;
  const totalOrders = data.ordersByStatus.reduce((a, s) => a + s._count, 0);
  const fulfillmentRate =
    totalOrders > 0
      ? Math.round(
          ((totalOrders - pendingOrders) / totalOrders) * 100
        )
      : 0;

  const userName =
    session?.user?.name?.split(/\s+/)[0] ?? session?.user?.email?.split('@')[0] ?? 'Kullanıcı';

  return (
    <div className="min-h-full dark:bg-[#0a0a0a]">
      {/* Subtle gradient orbs for depth (dark mode) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 hidden dark:block"
        aria-hidden
      >
        <div className="absolute -left-40 top-20 h-72 w-72 rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-500/5 blur-[120px]" />
      </div>
      <div className="relative z-10">
        <DashboardView
          data={{
            ...data,
            fulfillmentRate,
          }}
          userName={userName}
        />
      </div>
    </div>
  );
}
