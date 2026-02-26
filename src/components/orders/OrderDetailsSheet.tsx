'use client';

import {
  Package,
  Truck,
  User,
  FileText,
  Printer,
  Clock,
  CheckCircle2,
  Loader2,
  PackageCheck,
  XCircle,
  Undo2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrandChip } from '@/components/ui/brand-chip';

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Beklemede',
  CONFIRMED: 'Onaylandı',
  PROCESSING: 'İşleniyor',
  SHIPPED: 'Kargoya Verildi',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal',
  REFUNDED: 'İade',
};

const PLATFORM_LABELS: Record<string, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  AMAZON: 'Amazon',
  N11: 'N11',
  SHOPIFY: 'Shopify',
  CICEKSEPETI: 'Çiçeksepeti',
  PAZARAMA: 'Pazarama',
  IDEFIX: 'İdefix',
  GOTURC: 'GoTürk',
  PTTAVM: 'PTT Avm',
  MODANISA: 'Modanisa',
  ALLESGO: 'Allesgo',
  OTHER: 'Diğer',
};

const PLATFORM_COLOR: Record<string, string> = {
  TRENDYOL: 'bg-orange-500/[0.07] text-orange-700 dark:text-orange-400 border border-orange-500/20',
  HEPSIBURADA: 'bg-orange-600/[0.07] text-orange-800 dark:text-orange-300 border border-orange-600/20',
  AMAZON: 'bg-amber-500/[0.07] text-amber-800 dark:text-amber-400 border border-amber-500/20',
  N11: 'bg-red-500/[0.07] text-red-700 dark:text-red-400 border border-red-500/20',
  SHOPIFY: 'bg-green-600/[0.07] text-green-700 dark:text-green-400 border border-green-600/20',
  CICEKSEPETI: 'bg-pink-500/[0.07] text-pink-700 dark:text-pink-400 border border-pink-500/20',
  PAZARAMA: 'bg-blue-500/[0.07] text-blue-700 dark:text-blue-400 border border-blue-500/20',
  IDEFIX: 'bg-indigo-500/[0.07] text-indigo-700 dark:text-indigo-400 border border-indigo-500/20',
  OTHER: 'bg-muted/50 text-muted-foreground border border-border/50',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'border border-amber-500/20 bg-amber-500/[0.07] text-amber-700 dark:text-amber-400',
  CONFIRMED: 'border border-blue-500/20 bg-blue-500/[0.07] text-blue-700 dark:text-blue-400',
  PROCESSING: 'border border-violet-500/20 bg-violet-500/[0.07] text-violet-700 dark:text-violet-400',
  SHIPPED: 'border border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-400',
  DELIVERED: 'border border-green-500/20 bg-green-500/[0.07] text-green-700 dark:text-green-400',
  CANCELLED: 'border border-red-500/20 bg-red-500/[0.07] text-red-700 dark:text-red-400',
  REFUNDED: 'border border-slate-500/20 bg-slate-500/[0.07] text-slate-600 dark:text-slate-400',
};

const STATUS_ICON: Record<string, typeof Clock> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  PROCESSING: Loader2,
  SHIPPED: Truck,
  DELIVERED: PackageCheck,
  CANCELLED: XCircle,
  REFUNDED: Undo2,
};

type OrderItemType = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number | string;
  total: number | string;
  product?: {
    id: string;
    images?: Array<{ url: string }>;
  };
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  platform: string | null;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  total: number | string;
  currency: string;
  shippingAddress: unknown;
  billingAddress?: unknown;
  cargoTrackingNumber: string | null;
  cargoProvider: string | null;
  store: { name: string; slug: string };
  items: OrderItemType[];
};

function formatAddress(addr: unknown): string {
  if (addr == null) return '—';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object' && addr !== null) {
    const o = addr as Record<string, unknown>;
    const parts = [
      o.addressLine1 ?? o.address ?? o.street,
      o.district ?? o.neighborhood,
      o.city,
      o.postalCode ?? o.zipCode,
      o.country,
    ].filter(Boolean);
    return parts.map(String).join(', ') || '—';
  }
  return '—';
}

function toPrice(v: number | string, currency: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '–';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(n);
}

export function OrderDetailsSheet({
  order,
  open,
  onOpenChange,
  onStatusChange,
  updating,
}: {
  order: OrderDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (orderId: string, status: string) => void;
  updating?: boolean;
}) {
  if (!order) return null;

  const StatusIcon = STATUS_ICON[order.status] ?? Clock;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-lg overflow-y-auto border-l border-border/40 bg-background shadow-xl sm:max-w-xl transition-[transform] duration-300 ease-out"
      >
        <SheetHeader className="border-b border-border/50 px-5 pb-4 pt-4">
          <SheetTitle className="font-mono text-lg tracking-tight">
            #{order.orderNumber}
          </SheetTitle>
          <SheetDescription className="mt-0.5 text-sm text-muted-foreground">
            {order.store.name}
          </SheetDescription>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {order.platform && (
              <Badge
                variant="outline"
                className={PLATFORM_COLOR[order.platform] ?? PLATFORM_COLOR.OTHER}
              >
                <BrandChip code={order.platform} label={PLATFORM_LABELS[order.platform] ?? order.platform} />
              </Badge>
            )}
            <Badge
              variant="outline"
              className={STATUS_STYLE[order.status] ?? 'border-border/50 bg-muted/30 text-muted-foreground'}
            >
              <StatusIcon className="mr-1.5 h-3 w-3" />
              {ORDER_STATUS_LABEL[order.status] ?? order.status}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-5 py-5 pb-6">
          <section className="rounded-xl border border-border/50 bg-secondary/30 p-4 shadow-sm">
            <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Package className="h-2.5 w-2.5 text-primary" />
              </span>
              Ürünler
            </h4>
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-lg py-2 transition-colors hover:bg-secondary/50"
                >
                  <div className="aspect-square h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted/30">
                    {item.product?.images?.[0]?.url ? (
                      <img
                        src={item.product.images[0].url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-foreground">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.quantity} adet × {toPrice(item.unitPrice, order.currency)}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      {toPrice(item.total, order.currency)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border/50 bg-secondary/30 p-4 shadow-sm">
            <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-2.5 w-2.5 text-primary" />
              </span>
              Müşteri
            </h4>
            <p className="text-sm text-foreground">
              {order.customerName || order.customerEmail || '—'}
              {order.customerEmail && order.customerName && (
                <span className="text-muted-foreground"> · {order.customerEmail}</span>
              )}
            </p>
            {order.customerPhone && (
              <p className="mt-1 text-xs text-muted-foreground">{order.customerPhone}</p>
            )}
          </section>

          <section className="rounded-xl border border-border/50 bg-secondary/30 p-4 shadow-sm">
            <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Truck className="h-2.5 w-2.5 text-primary" />
              </span>
              Teslimat adresi
            </h4>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {formatAddress(order.shippingAddress)}
            </p>
          </section>

          {order.billingAddress != null && (
            <section className="rounded-xl border border-border/50 bg-secondary/30 p-4 shadow-sm">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-2.5 w-2.5 text-primary" />
                </span>
                Fatura adresi
              </h4>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {formatAddress(order.billingAddress)}
              </p>
            </section>
          )}

          {(order.cargoProvider || order.cargoTrackingNumber) && (
            <div className="rounded-xl border border-border/50 bg-amber-500/[0.06] p-4 shadow-sm">
              <p className="text-xs">
                <span className="font-semibold text-foreground">Kargo</span>
                <span className="text-muted-foreground">
                  {' · '}
                  {[order.cargoProvider, order.cargoTrackingNumber].filter(Boolean).join(' · ')}
                </span>
              </p>
            </div>
          )}

          {onStatusChange && (
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 shadow-sm">
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Sipariş durumu
              </label>
              <Select
                value={order.status}
                onValueChange={(v) => onStatusChange(order.id, v)}
                disabled={updating}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-row gap-2 pt-1">
            <Button
              type="button"
              disabled
              title="Bu özellik MVP dışında"
              className="h-10 flex-1 px-4 text-sm font-medium"
            >
              <FileText className="mr-2 h-3.5 w-3.5" />
              E-Fatura (Yakında)
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled
              title="Bu özellik MVP dışında"
              className="h-10 shrink-0 border-border/50 px-4 text-sm font-medium hover:bg-secondary/50"
            >
              <Printer className="mr-2 h-3.5 w-3.5" />
              Kargo Etiketi (Yakında)
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
