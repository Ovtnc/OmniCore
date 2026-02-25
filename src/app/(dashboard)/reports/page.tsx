import Link from 'next/link';
import { BarChart3, Package, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getReportData() {
  try {
    const [
      orderCount,
      orderTotalRevenue,
      ordersByStatus,
      productCount,
      lowStockCount,
      storeCount,
      ordersByStore,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.product.count(),
      prisma.product.count({
        where: {
          trackInventory: true,
          stockQuantity: { lte: 5 },
        },
      }),
      prisma.store.count(),
      prisma.order.groupBy({
        by: ['storeId'],
        _count: true,
        _sum: { total: true },
        where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      }),
    ]);

    const storeIds = ordersByStore.map((o) => o.storeId);
    const stores = storeIds.length
      ? await prisma.store.findMany({
          where: { id: { in: storeIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];

    const revenueByStore = ordersByStore.map((o) => ({
      storeId: o.storeId,
      orderCount: o._count,
      total: Number(o._sum.total ?? 0),
      storeName: stores.find((s) => s.id === o.storeId)?.name ?? o.storeId,
    }));

    return {
      orderCount,
      totalRevenue: Number(orderTotalRevenue._sum.total ?? 0),
      ordersByStatus,
      productCount,
      lowStockCount,
      storeCount,
      revenueByStore,
    };
  } catch {
    return {
      orderCount: 0,
      totalRevenue: 0,
      ordersByStatus: [] as { status: string; _count: number }[],
      productCount: 0,
      lowStockCount: 0,
      storeCount: 0,
      revenueByStore: [] as { storeId: string; orderCount: number; total: number; storeName: string }[],
    };
  }
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Beklemede',
  CONFIRMED: 'Onaylandı',
  PROCESSING: 'İşleniyor',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim',
  CANCELLED: 'İptal',
  REFUNDED: 'İade',
};

export default async function ReportsPage() {
  const data = await getReportData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Raporlar</h1>
        <p className="text-muted-foreground">
          Satış, sipariş ve envanter raporları.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Sipariş</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.orderCount}</div>
            <p className="text-xs text-muted-foreground">Tüm zamanlar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ciro</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalRevenue.toLocaleString('tr-TR')} ₺
            </div>
            <p className="text-xs text-muted-foreground">İptal/İade hariç</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ürün</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.productCount}</div>
            <p className="text-xs text-muted-foreground">Katalog</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Düşük Stok</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Eşik altı ürün</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sipariş Durumları
            </CardTitle>
            <CardDescription>Sipariş sayısına göre durum dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            {data.ordersByStatus.length === 0 ? (
              <p className="text-muted-foreground text-sm">Henüz sipariş yok.</p>
            ) : (
              <ul className="space-y-2">
                {data.ordersByStatus.map((s) => (
                  <li
                    key={s.status}
                    className="flex justify-between items-center border-b pb-2 last:border-0"
                  >
                    <span className="text-sm">
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                    <span className="font-medium">{s._count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mağaza Bazlı Ciro</CardTitle>
            <CardDescription>Sipariş toplamı ve adet (iptal/İade hariç)</CardDescription>
          </CardHeader>
          <CardContent>
            {data.revenueByStore.length === 0 ? (
              <p className="text-muted-foreground text-sm">Henüz sipariş yok.</p>
            ) : (
              <ul className="space-y-2">
                {data.revenueByStore.map((r) => (
                  <li
                    key={r.storeId}
                    className="flex justify-between items-center border-b pb-2 last:border-0"
                  >
                    <span className="text-sm">{r.storeName}</span>
                    <span className="font-medium">
                      {r.total.toLocaleString('tr-TR')} ₺ ({r.orderCount} sipariş)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <Button asChild variant="outline">
            <Link href="/">Dashboard&apos;a dön</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
