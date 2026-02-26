'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Search,
  Calendar,
  CheckCheck,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { BrandChip } from '@/components/ui/brand-chip';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRelativeTime } from '@/lib/format-relative-time';
import { toast } from 'sonner';
import { getCargoTrackingUrl } from '@/lib/cargo-tracking';
import { cn } from '@/lib/utils';

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
  PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400/90 border-0',
  CONFIRMED: 'bg-blue-500/10 text-blue-700 dark:text-blue-400/90 border-0',
  PROCESSING: 'bg-violet-500/10 text-violet-700 dark:text-violet-400/90 border-0',
  SHIPPED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400/90 border-0',
  DELIVERED: 'bg-green-500/10 text-green-700 dark:text-green-400/90 border-0',
  CANCELLED: 'bg-red-500/10 text-red-700 dark:text-red-400/90 border-0',
  REFUNDED: 'bg-slate-500/10 text-slate-600 dark:text-slate-400/90 border-0',
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

const PLATFORM_BORDER: Record<string, string> = {
  TRENDYOL: 'border-l-orange-500',
  HEPSIBURADA: 'border-l-orange-600',
  AMAZON: 'border-l-amber-500',
  N11: 'border-l-red-500',
  SHOPIFY: 'border-l-green-600',
  CICEKSEPETI: 'border-l-pink-500',
  PAZARAMA: 'border-l-blue-500',
  IDEFIX: 'border-l-indigo-500',
  OTHER: 'border-l-muted-foreground/50',
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
    <div className="space-y-6 lg:space-y-8">
      <div className="flex justify-between gap-4">
        <div className="h-9 w-48 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-muted/60" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl border border-border/40 bg-background/60" />
      <div className="h-[400px] animate-pulse rounded-2xl border border-border/40 bg-background/60" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const Icon = ORDER_STATUS_ICON[status] ?? Clock;
  const isPending = status === 'PENDING' || status === 'PROCESSING';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border-0',
        ORDER_STATUS_STYLE[status] ?? 'bg-muted/50 text-muted-foreground'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full bg-current',
          isPending && 'animate-pulse'
        )}
      />
      <Icon className="h-3 w-3 shrink-0 opacity-80" strokeWidth={1.5} />
      <span>{ORDER_STATUS_LABEL[status] ?? status}</span>
    </span>
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
  const [searchQuery, setSearchQuery] = useState('');
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'cancelled') params.set('status', 'CANCELLED,REFUNDED');
      else params.set('status', statusFilter);
    }
    if (platformFilter && platformFilter !== 'all') params.set('platform', platformFilter);
    if (paymentFilter && paymentFilter !== 'all') params.set('paymentStatus', paymentFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    params.set('page', String(page));
    params.set('limit', '10');
    fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.orders) setData(d);
        else setData({ orders: [], total: 0, page: 1, limit: 10, totalPages: 0 });
      })
      .catch(() => setData({ orders: [], total: 0, page: 1, limit: 10, totalPages: 0 }))
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
          toast.success('Sipariş güncellendi');
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
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
        }
      })
      .catch(() => toast.error('Sipariş güncellenemedi'))
      .finally(() => setUpdating(false));
  }, []);

  const bulkConfirm = useCallback(() => {
    selectedIds.forEach((id) => updateOrderStatus(id, 'CONFIRMED'));
    setSelectedIds(new Set());
  }, [selectedIds, updateOrderStatus]);

  const orders = data?.orders ?? [];
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(
      (o) =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerEmail?.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Siparişler</h1>
          <p className="mt-1 text-muted-foreground">
            Tüm kanallardan gelen siparişler. Satıra tıklayarak detayı açın.
          </p>
        </div>
        <span className="rounded-full border border-border/40 bg-muted/30 px-3 py-1.5 text-sm font-medium text-muted-foreground">
          Toplam {data?.total ?? '—'} sipariş
        </span>
      </motion.div>

      {/* Toolbar: Tabs + Search + Date + Store */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="space-y-4"
      >
        <Tabs
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <TabsList className="h-11 w-full flex-wrap justify-start gap-0.5 rounded-xl border border-border/40 bg-muted/20 p-1 shadow-none">
            <TabsTrigger value="all" className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Hepsi
            </TabsTrigger>
            <TabsTrigger value="PENDING" className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Bekleyenler
            </TabsTrigger>
            <TabsTrigger value="CONFIRMED" className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Onaylandı
            </TabsTrigger>
            <TabsTrigger value="PROCESSING" className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              İşleniyor
            </TabsTrigger>
            <TabsTrigger value="SHIPPED" className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Kargoda
            </TabsTrigger>
            <TabsTrigger value="DELIVERED" className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Teslim
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              İptal / İade
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm rounded-xl border border-border/50 bg-background transition-[border-color,box-shadow] duration-200 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 pointer-events-none [[data-focus]:~]:text-foreground" />
            <Input
              type="search"
              placeholder="Sipariş no, müşteri..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 border-0 bg-transparent pl-9 pr-4 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background px-2 transition-[border-color,box-shadow] duration-200 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-0">
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-9 w-[130px] border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-9 w-[130px] border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
            />
          </div>
          <Select
            value={storeId}
            onValueChange={(v) => {
              setStoreId(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-[180px] rounded-xl border-border/50">
              <SelectValue placeholder="Mağaza" />
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
          <Select
            value={platformFilter}
            onValueChange={(v) => {
              setPlatformFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-[160px] rounded-xl border-border/50">
              <SelectValue placeholder="Pazaryeri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {PLATFORM_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PLATFORM_LABELS[p] ?? p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Table card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center p-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground">Yükleniyor…</p>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Hadi satış yapalım!"
                description={
                  orders.length === 0
                    ? 'Pazaryeri veya B2C kanallarından gelen siparişler burada listelenir.'
                    : 'Arama veya filtreye uyan sipariş bulunamadı.'
                }
                actionLabel={orders.length === 0 ? undefined : undefined}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/60 bg-muted/20 hover:bg-muted/20 h-12">
                        <TableHead className="w-12 py-5 pl-5 pr-0 [&:has([role=checkbox])]:pr-0">
                          <input
                            type="checkbox"
                            checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-border focus:ring-2 focus:ring-primary/20"
                          />
                        </TableHead>
                        <TableHead className="py-5 pl-4 font-medium text-muted-foreground">Sipariş No</TableHead>
                        <TableHead className="py-5 font-medium text-muted-foreground">Pazaryeri</TableHead>
                        <TableHead className="py-5 font-medium text-muted-foreground">Müşteri</TableHead>
                        <TableHead className="py-5 text-right font-medium text-muted-foreground">Toplam</TableHead>
                        <TableHead className="py-5 font-medium text-muted-foreground">Tarih</TableHead>
                        <TableHead className="py-5 font-medium text-muted-foreground">Kargo</TableHead>
                        <TableHead className="py-5 font-medium text-muted-foreground">Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {filteredOrders.map((order, index) => {
                          const cargoUrl = getCargoTrackingUrl(order.cargoProvider, order.cargoTrackingNumber);
                          return (
                            <motion.tr
                              key={order.id}
                              layout
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
                              className={cn(
                                'group cursor-pointer border-b border-border/40 bg-muted/30 transition-all duration-200 hover:bg-muted/50 hover:shadow-inner',
                                selectedIds.has(order.id) && 'bg-primary/5 hover:bg-primary/10'
                              )}
                              onClick={() => openSheet(order)}
                            >
                              <TableCell
                                className="w-12 py-5 pl-5 pr-0 align-middle [&:has([role=checkbox])]:pr-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(order.id)}
                                  onChange={() => toggleSelect(order.id)}
                                  className="h-4 w-4 rounded border-border focus:ring-2 focus:ring-primary/20"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </TableCell>
                              <TableCell className="py-5 pl-4 font-mono text-sm font-medium">
                                #{order.orderNumber}
                              </TableCell>
                              <TableCell className="py-5">
                                {order.platform ? (
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-2 rounded-full border-l-2 pl-2.5 pr-2 py-1 bg-muted/40',
                                      PLATFORM_BORDER[order.platform] ?? PLATFORM_BORDER.OTHER
                                    )}
                                  >
                                    <BrandChip
                                      code={order.platform}
                                      label={PLATFORM_LABELS[order.platform] ?? order.platform}
                                      className="text-xs"
                                    />
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                              <TableCell className="py-5 text-sm text-muted-foreground">
                                {order.customerName || order.customerEmail || '—'}
                              </TableCell>
                              <TableCell className="py-5 text-right font-mono text-sm font-medium tabular-nums">
                                {toPrice(order.total, order.currency)}
                              </TableCell>
                              <TableCell className="py-5 text-sm text-muted-foreground">
                                {formatRelativeTime(new Date(order.createdAt))}
                              </TableCell>
                              <TableCell className="py-5" onClick={(e) => e.stopPropagation()}>
                                {cargoUrl ? (
                                  <a
                                    href={cargoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title="Kargo takip"
                                  >
                                    <Truck className="h-4 w-4" strokeWidth={1.5} />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground/50">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-5" onClick={(e) => e.stopPropagation()}>
                                <Select
                                  value={order.status}
                                  onValueChange={(v) => updateOrderStatus(order.id, v)}
                                  disabled={updating}
                                >
                                  <SelectTrigger
                                    className={cn(
                                      'h-8 w-[150px] rounded-lg border-0 bg-transparent shadow-none hover:bg-muted/50',
                                      ORDER_STATUS_STYLE[order.status]
                                    )}
                                  >
                                    {(() => {
                                      const Icon = ORDER_STATUS_ICON[order.status] ?? Clock;
                                      return (
                                        <>
                                          <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.5} />
                                          <SelectValue />
                                        </>
                                      );
                                    })()}
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
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border/40 px-5 py-3">
                    <p className="text-sm text-muted-foreground">
                      Sayfa <span className="font-medium text-foreground">{data?.page ?? 1}</span> / {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
          >
            <div className="flex items-center gap-4 rounded-2xl bg-card/80 px-5 py-3 shadow-xl ring-1 ring-white/10 backdrop-blur-md">
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} sipariş seçildi
              </span>
              <Button size="sm" className="rounded-xl" onClick={bulkConfirm}>
                <CheckCheck className="mr-2 h-4 w-4" />
                Seçilenleri Onayla
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" disabled title="Yakında">
                <FileText className="mr-2 h-4 w-4" />
                Fatura Kes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onClick={() => setSelectedIds(new Set())}
              >
                İptal
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
