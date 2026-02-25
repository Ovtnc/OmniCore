import { Suspense } from 'react';
import Link from 'next/link';
import { Package, ShoppingCart, FileText, Truck, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { IntegrationStatus } from '@/components/dashboard/integration-status';
import { ImportQueueStatus } from '@/components/dashboard/import-queue-status';
import { SyncMonitor } from '@/components/dashboard/SyncMonitor';
import { AIMatchReview } from '@/components/dashboard/AIMatchReview';
import { PlatformHealth } from '@/components/dashboard/PlatformHealth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getDashboardData() {
  try {
    const [orderCount, productCount, storeCount, recentOrders, marketplaceCount, accountingCount] =
      await Promise.all([
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
      ]);

    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      orderCount,
      productCount,
      storeCount,
      recentOrders,
      marketplaceCount,
      accountingCount,
      ordersByStatus,
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
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const pendingOrders =
    data.ordersByStatus.find((s) => s.status === 'PENDING')?._count ?? 0;
  const totalOrders = data.ordersByStatus.reduce((a, s) => a + s._count, 0);
  const fulfillmentRate =
    totalOrders > 0
      ? Math.round(
          ((totalOrders - pendingOrders) / totalOrders) * 100
        )
      : 0;

  return (
    <>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Genel Bakış
        </h1>
        <p className="text-muted-foreground">
          Sipariş, stok ve e-fatura durumunu tek ekrandan takip edin.
        </p>
      </div>

      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats
          orderCount={data.orderCount}
          productCount={data.productCount}
          storeCount={data.storeCount}
          marketplaceCount={data.marketplaceCount}
          accountingCount={data.accountingCount}
          fulfillmentRate={fulfillmentRate}
        />
      </Suspense>

      {/* Canlı sync + Platform sağlık */}
      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SyncMonitor />
        </div>
        <div>
          <PlatformHealth />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              Son Siparişler
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/orders">
                Tümü <ShoppingCart className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="text-muted-foreground">Yükleniyor...</div>}>
              <RecentOrders orders={data.recentOrders} />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Entegrasyonlar
            </CardTitle>
            <CardDescription>
              Pazaryeri ve muhasebe bağlantıları
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AIMatchReview />
            <ImportQueueStatus />
            <IntegrationStatus
              marketplaceActive={data.marketplaceCount}
              accountingActive={data.accountingCount}
            />
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <p className="font-medium text-foreground">Sipariş tamamlama</p>
              <Progress value={fulfillmentRate} className="mt-2 h-2" />
              <p className="mt-1 text-muted-foreground">
                %{fulfillmentRate} işlendi
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Hızlı Erişim</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            title="Ürünler"
            description="Katalog ve stok"
            href="/products"
            icon={<Package className="h-5 w-5" />}
          />
          <QuickActionCard
            title="Siparişler"
            description="Tüm siparişler"
            href="/orders"
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <QuickActionCard
            title="E-Fatura"
            description="Fatura durumları"
            href="/accounting"
            icon={<FileText className="h-5 w-5" />}
          />
          <QuickActionCard
            title="AI Destek"
            description="Müşteri soru-cevap asistanı"
            href="/support"
            icon={<MessageCircle className="h-5 w-5" />}
          />
          <QuickActionCard
            title="Kargo"
            description="Kargo entegrasyonları"
            href="/logistics"
            icon={<Truck className="h-5 w-5" />}
          />
        </div>
      </div>
    </>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
