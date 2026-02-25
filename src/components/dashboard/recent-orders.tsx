'use client';

import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order, Store, OrderItem } from '@prisma/client';

type OrderWithRelations = Order & {
  store: Pick<Store, 'name' | 'slug'>;
  items: OrderItem[];
};

export function RecentOrders({ orders }: { orders: OrderWithRelations[] }) {
  if (orders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Henüz sipariş yok. Pazaryeri veya B2C kanallarından gelen siparişler burada listelenir.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/orders?orderId=${order.id}`}
          className="block rounded-lg border p-3 transition-colors hover:bg-accent/50"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">
                #{order.orderNumber} · {order.store.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.customerName ?? order.customerEmail ?? '—'} ·{' '}
                {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                {formatCurrency(Number(order.total), order.currency)}
              </p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  order.status === 'PENDING'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    : order.status === 'SHIPPED' || order.status === 'DELIVERED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {order.status}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
