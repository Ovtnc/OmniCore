'use client';

import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  Store,
  Link2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

const statCards: Array<{
  title: string;
  key: string;
  icon: typeof Package;
  gradient: string;
  iconBg: string;
  color: string;
  trendKey?: string;
}> = [
  {
    title: 'Sipariş',
    key: 'orderCount',
    icon: ShoppingCart,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconBg: 'bg-blue-500/15',
    color: 'text-blue-600 dark:text-blue-400',
    trendKey: 'orderTrendPercent',
  },
  {
    title: 'Ürün Sayısı',
    key: 'productCount',
    icon: Package,
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconBg: 'bg-emerald-500/15',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    title: 'Mağaza',
    key: 'storeCount',
    icon: Store,
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconBg: 'bg-violet-500/15',
    color: 'text-violet-600 dark:text-violet-400',
  },
  {
    title: 'Pazaryeri',
    key: 'marketplaceCount',
    icon: Link2,
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconBg: 'bg-amber-500/15',
    color: 'text-amber-600 dark:text-amber-400',
  },
  
];

function TrendBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" strokeWidth={1.5} />
        <span>Değişim yok</span>
      </span>
    );
  }
  const isPositive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400'
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
      ) : (
        <TrendingDown className="h-3 w-3" strokeWidth={1.5} />
      )}
      <span>
        Geçen haftaya göre %{Math.abs(value)}
        {isPositive ? ' artış' : ' azalış'}
      </span>
    </span>
  );
}

export function DashboardStats({
  orderCount,
  productCount,
  storeCount,
  marketplaceCount,
  accountingCount,
  fulfillmentRate,
  orderTrendPercent = 0,
}: {
  orderCount: number;
  productCount: number;
  storeCount: number;
  marketplaceCount: number;
  accountingCount: number;
  fulfillmentRate: number;
  orderTrendPercent?: number;
}) {
  const values: Record<string, number> = {
    orderCount,
    productCount,
    storeCount,
    marketplaceCount,
    accountingCount,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map(({ title, key, icon: Icon, gradient, iconBg, color, trendKey }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          whileHover={{ scale: 1.02 }}
          className="rounded-2xl bg-card/50 p-4 shadow-none ring-1 ring-white/10 backdrop-blur-md dark:ring-white/5 transition-shadow hover:shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {title}
            </span>
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} ${iconBg} ${color}`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{values[key] ?? 0}</div>
            {trendKey === 'orderTrendPercent' && (
              <div className="mt-1">
                <TrendBadge value={orderTrendPercent} />
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
