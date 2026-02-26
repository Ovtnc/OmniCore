'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  FileText,
  Truck,
  MessageCircle,
} from 'lucide-react';
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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

function formatDashboardDate() {
  return new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function DashboardView({
  data,
  userName,
}: {
  data: {
    orderCount: number;
    productCount: number;
    storeCount: number;
    recentOrders: unknown[];
    marketplaceCount: number;
    accountingCount: number;
    ordersByStatus: { status: string; _count: number }[];
    orderTrendPercent: number;
    fulfillmentRate: number;
  };
  userName: string;
}) {
  return (
    <>
      {/* Hero: greeting + title + badges */}
      <motion.div
        className="mb-8 md:mb-10"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-sm font-medium text-muted-foreground">
          {getGreeting()}, <span className="text-foreground">{userName}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Genel Bakış
          </h1>
          <span className="rounded-full border border-border/40 bg-background/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur-sm dark:ring-1 dark:ring-white/5">
            {formatDashboardDate()}
          </span>
          <span className="rounded-full border border-border/40 bg-background/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur-sm dark:ring-1 dark:ring-white/5">
            {data.storeCount} mağaza
          </span>
        </div>
        <p className="mt-1.5 text-muted-foreground">
          Sipariş, stok ve e-fatura durumunu tek ekrandan takip edin.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 lg:space-y-8"
      >
        <motion.div variants={item}>
          <Suspense fallback={<DashboardStatsSkeleton />}>
            <DashboardStats
              orderCount={data.orderCount}
              productCount={data.productCount}
              storeCount={data.storeCount}
              marketplaceCount={data.marketplaceCount}
              accountingCount={data.accountingCount}
              fulfillmentRate={data.fulfillmentRate}
              orderTrendPercent={data.orderTrendPercent}
            />
          </Suspense>
        </motion.div>

        {/* Canlı Takip Merkezi */}
        <motion.section variants={item} className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Canlı Takip Merkezi
          </h2>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SyncMonitor />
            </div>
            <div>
              <PlatformHealth />
            </div>
          </div>
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div variants={item} className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                  Son Siparişler
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/orders">
                    Tümü{' '}
                    <ShoppingCart
                      className="ml-1 h-4 w-4"
                      strokeWidth={1.5}
                    />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Suspense
                  fallback={
                    <div className="text-muted-foreground">Yükleniyor...</div>
                  }
                >
                  <RecentOrders orders={data.recentOrders as never[]} />
                </Suspense>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
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
                <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-sm backdrop-blur-sm">
                  <p className="font-medium text-foreground">
                    Sipariş tamamlama
                  </p>
                  <Progress
                    value={data.fulfillmentRate}
                    className="mt-2 h-1.5 rounded-full"
                  />
                  <p className="mt-1 text-muted-foreground">
                    %{data.fulfillmentRate} işlendi
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Hızlı Erişim - Floating Dock */}
        <motion.section variants={item} className="pt-2">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Hızlı Erişim
          </h2>
          <div className="flex flex-wrap gap-2">
            <QuickActionCard
              title="Ürünler"
              description="Katalog ve stok"
              href="/products"
              icon={<Package className="h-4 w-4" strokeWidth={1.5} />}
            />
            <QuickActionCard
              title="Siparişler"
              description="Tüm siparişler"
              href="/orders"
              icon={<ShoppingCart className="h-4 w-4" strokeWidth={1.5} />}
            />
            <QuickActionCard
              title="E-Fatura"
              description="Fatura durumları"
              href="/accounting"
              icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}
            />
            <QuickActionCard
              title="AI Destek"
              description="Soru-cevap asistanı"
              href="/support"
              icon={<MessageCircle className="h-4 w-4" strokeWidth={1.5} />}
            />
            <QuickActionCard
              title="Kargo"
              description="Kargo entegrasyonları"
              href="/logistics"
              icon={<Truck className="h-4 w-4" strokeWidth={1.5} />}
            />
          </div>
        </motion.section>
      </motion.div>
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
      <motion.div
        className="group flex items-center gap-3 rounded-2xl bg-card/50 px-4 py-3 ring-1 ring-white/10 backdrop-blur-md transition-all duration-200 hover:shadow-xl dark:ring-white/5"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </motion.div>
    </Link>
  );
}

function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-card/50 p-4 ring-1 ring-white/10 backdrop-blur-md dark:ring-white/5"
        >
          <div className="flex justify-between">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-8 animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
