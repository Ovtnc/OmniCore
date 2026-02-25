'use client';

import { Package, ShoppingCart, Store, Link2, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const statCards = [
  {
    title: 'Toplam Sipariş',
    key: 'orderCount',
    icon: ShoppingCart,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    title: 'Ürün Sayısı',
    key: 'productCount',
    icon: Package,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    title: 'Mağaza',
    key: 'storeCount',
    icon: Store,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    title: 'Pazaryeri',
    key: 'marketplaceCount',
    icon: Link2,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    title: 'E-Fatura / Muhasebe',
    key: 'accountingCount',
    icon: FileText,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
  },
];

export function DashboardStats({
  orderCount,
  productCount,
  storeCount,
  marketplaceCount,
  accountingCount,
  fulfillmentRate,
}: {
  orderCount: number;
  productCount: number;
  storeCount: number;
  marketplaceCount: number;
  accountingCount: number;
  fulfillmentRate: number;
}) {
  const values: Record<string, number> = {
    orderCount,
    productCount,
    storeCount,
    marketplaceCount,
    accountingCount,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statCards.map(({ title, key, icon: Icon, color, bg }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {title}
            </span>
            <div className={`rounded-lg p-2 ${bg} ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{values[key] ?? 0}</div>
          </CardContent>
        </Card>
      ))}
      <Card className="md:col-span-2 lg:col-span-1 lg:col-start-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <span className="text-sm font-medium text-muted-foreground">
            İşlem oranı
          </span>
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">%{fulfillmentRate}</div>
          <p className="text-xs text-muted-foreground">sipariş işlendi</p>
        </CardContent>
      </Card>
    </div>
  );
}
