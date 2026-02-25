'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  CheckCircle2,
  Loader2,
  Truck,
  PackageCheck,
  XCircle,
  Undo2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderDetailsSheet, type OrderDetail } from '@/components/orders/OrderDetailsSheet';

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Beklemede',
  CONFIRMED: 'Onaylandı',
  PROCESSING: 'İşleniyor',
  SHIPPED: 'Kargoya Verildi',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal',
  REFUNDED: 'İade',
};

const ORDER_STATUS_STYLE: Record<string, string> = {
  PENDING:
    'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-sm',
  CONFIRMED:
    'border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-400 shadow-sm',
  PROCESSING:
    'border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-400 shadow-sm',
  SHIPPED:
    'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-sm',
  DELIVERED:
    'border-green-500/40 bg-green-500/15 text-green-700 dark:text-green-400 shadow-sm',
  CANCELLED:
    'border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-400 shadow-sm',
  REFUNDED:
    'border-slate-500/40 bg-slate-500/15 text-slate-600 dark:text-slate-400 shadow-sm',
};

const ORDER_STATUS_ICON: Record<string, typeof Clock> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  PROCESSING: Loader2,
  SHIPPED: Truck,
  DELIVERED: PackageCheck,
  CANCELLED: XCircle,
  REFUNDED: Undo2,
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
  WOOCOMMERCE: 'WooCommerce',
  MAGENTO: 'Magento',
  CIMRI: 'Cimri',
  AKAKCE: 'Akakçe',
  GOOGLE_MERCHANT: 'Google Merchant',
  META_CATALOG: 'Meta Katalog',
  GITTIGIDIYOR: 'GittiGidiyor',
  EPTTAA: 'ePTTAA',
  MORHIPO: 'Morhipo',
  OTHER: 'Diğer',
};

const PLATFORM_COLOR: Record<string, string> = {
  TRENDYOL: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  HEPSIBURADA: 'bg-orange-600/15 text-orange-800 dark:text-orange-300 border-orange-600/30',
  AMAZON: 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30',
  N11: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  SHOPIFY: 'bg-green-600/15 text-green-700 dark:text-green-400 border-green-600/30',
  CICEKSEPETI: 'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30',
  PAZARAMA: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  IDEFIX: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
  OTHER: 'bg-muted text-muted-foreground border-border',
};

type StoreOption = { id: string; name: string; slug: string };
type OrderItemApi = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number | string;
  total: number | string;
  product?: { id: string; images?: Array<{ url: string }> };
};
type OrderApi = {
  id: string;
  orderNumber: string;
  storeId: string;
  platform: string | null;
  channel: string | null;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone?: string | null;
  total: number | string;
  currency: string;
  shippingAddress: unknown;
  billingAddress?: unknown;
  cargoTrackingNumber: string | null;
  cargoProvider: string | null;
  createdAt: string;
  store: { name: string; slug: string };
  marketplaceConnection?: { id: string; platform: string } | null;
  items: OrderItemApi[];
};

function OrdersFallback() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted/50" />
    </div>
  );
}

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    orders: OrderApi[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOrder, setSheetOrder] = useState<OrderDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((list) => (Array.isArray(list) ? setStores(list) : []))
      .catch(() => setStores([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (storeId && storeId !== 'all') params.set('storeId', storeId);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (platformFilter && platformFilter !== 'all') params.set('platform', platformFilter);
    if (paymentFilter && paymentFilter !== 'all') params.set('paymentStatus', paymentFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    params.set('page', String(page));
    params.set('limit', '20');
    fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.orders) setData(d);
        else setData({ orders: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      })
      .catch(() => setData({ orders: [], total: 0, page: 1, limit: 20, totalPages: 0 }))
      .finally(() => setLoading(false));
  }, [storeId, statusFilter, platformFilter, paymentFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    if (!orderIdFromUrl) return;
    const inList = data?.orders?.find((o) => o.id === orderIdFromUrl);
    if (inList) {
      openSheet(inList);
      return;
    }
    fetch(`/api/orders/${orderIdFromUrl}`)
      .then((r) => r.json())
      .then((order) => {
        if (order?.id) openSheet(order);
      })
      .catch(() => {});
  }, [orderIdFromUrl, data?.orders]);

  const openSheet = useCallback((order: OrderApi) => {
    setSheetOrder(order as OrderDetail);
    setSheetOpen(true);
    fetch(`/api/orders/${order.id}`)
      .then((r) => r.json())
      .then((full) => {
        if (full?.id) setSheetOrder(full as OrderDetail);
      })
      .catch(() => {});
  }, []);

  const updateOrderStatus = useCallback((orderId: string, newStatus: string) => {
    setUpdating(true);
    fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((r) => r.json())
      .then((updated) => {
        if (updated.id) {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  orders: prev.orders.map((o) =>
                    o.id === orderId ? { ...o, status: updated.status } : o
                  ),
                }
              : null
          );
          setSheetOrder((prev) =>
            prev?.id === orderId ? { ...prev, status: updated.status } : prev
          );
        }
      })
      .finally(() => setUpdating(false));
  }, []);

  const orders = data?.orders ?? [];
  const totalPages = data?.totalPages ?? 0;
  const toPrice = (v: number | string, currency: string) =>
    Number.isFinite(Number(v))
      ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(
          Number(v)
        )
      : '–';

  const PLATFORM_OPTIONS = Object.keys(PLATFORM_LABELS).filter((k) => k !== 'OTHER');

  const PAYMENT_LABELS: Record<string, string> = {
    PENDING: 'Beklemede',
    PAID: 'Ödendi',
    FAILED: 'Başarısız',
    REFUNDED: 'İade',
    PARTIAL_REFUND: 'Kısmi iade',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Siparişler</h1>
        <p className="text-muted-foreground">
          Tüm kanallardan gelen siparişler. Tabloda bir satıra tıklayarak detayı açın.
        </p>
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtreler</CardTitle>
          <CardDescription>Mağaza, durum ve pazaryeri ile daraltın</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mağaza</span>
              <Select
                value={storeId}
                onValueChange={(v) => {
                  setStoreId(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm mağazalar</SelectItem>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Durum</span>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm durumlar</SelectItem>
                  {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ödeme</span>
              <Select
                value={paymentFilter}
                onValueChange={(v) => {
                  setPaymentFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tarih</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
              <span className="text-muted-foreground">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center">Pazaryeri:</span>
            <Button
              variant={platformFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setPlatformFilter('all');
                setPage(1);
              }}
            >
              Tümü
            </Button>
            {PLATFORM_OPTIONS.map((p) => (
              <Button
                key={p}
                variant={platformFilter === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setPlatformFilter(p);
                  setPage(1);
                }}
              >
                {PLATFORM_LABELS[p] ?? p}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-lg shadow-black/5 dark:shadow-none dark:ring-1 dark:ring-border">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="rounded-lg bg-primary/10 p-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            Sipariş listesi
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Toplam <span className="font-semibold text-foreground">{data?.total ?? 0}</span> sipariş
            · Sayfa {data?.page ?? 1} / {totalPages || 1}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 bg-muted/10">
              <p className="text-sm text-muted-foreground">Yükleniyor…</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-muted-foreground/20 bg-muted/10 p-8">
              <div className="rounded-full bg-muted p-4">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Henüz sipariş yok</p>
              <p className="text-center text-sm text-muted-foreground">
                Pazaryeri veya B2C kanallarından gelen siparişler burada listelenir.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-b-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Sipariş No</TableHead>
                      <TableHead className="font-semibold">Pazaryeri</TableHead>
                      <TableHead className="font-semibold">Müşteri</TableHead>
                      <TableHead className="text-right font-semibold">Toplam</TableHead>
                      <TableHead className="font-semibold">Tarih</TableHead>
                      <TableHead className="font-semibold">Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const StatusIcon = ORDER_STATUS_ICON[order.status] ?? Clock;
                      return (
                        <TableRow
                          key={order.id}
                          className="cursor-pointer border-b transition-colors hover:bg-primary/5 hover:shadow-sm"
                          onClick={() => openSheet(order)}
                        >
                          <TableCell className="font-mono font-medium">
                            #{order.orderNumber}
                          </TableCell>
                          <TableCell>
                            {order.platform ? (
                              <Badge
                                variant="outline"
                                className={
                                  PLATFORM_COLOR[order.platform] ?? PLATFORM_COLOR.OTHER
                                }
                              >
                                {PLATFORM_LABELS[order.platform] ?? order.platform}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {order.customerName || order.customerEmail || '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {toPrice(order.total, order.currency)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={order.status}
                              onValueChange={(v) => updateOrderStatus(order.id, v)}
                              disabled={updating}
                            >
                              <SelectTrigger
                                className={`h-8 w-[140px] border shadow-sm ${
                                  ORDER_STATUS_STYLE[order.status] ??
                                  'border-border bg-muted/50 text-muted-foreground'
                                }`}
                              >
                                <StatusIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" /> Önceki
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Sayfa {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sonraki <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <OrderDetailsSheet
        order={sheetOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onStatusChange={updateOrderStatus}
        updating={updating}
      />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersFallback />}>
      <OrdersPageContent />
    </Suspense>
  );
}
