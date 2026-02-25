'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart,
  Store,
  ChevronLeft,
  ChevronRight,
  Filter,
  Package,
  Truck,
  User,
  CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Beklemede',
  CONFIRMED: 'Onaylandı',
  PROCESSING: 'İşleniyor',
  SHIPPED: 'Kargoya Verildi',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal',
  REFUNDED: 'İade',
};

const ORDER_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  PROCESSING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
  REFUNDED: 'outline',
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
type OrderItem = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number | string;
  total: number | string;
};
type Order = {
  id: string;
  orderNumber: string;
  storeId: string;
  platform: string | null;
  channel: string | null;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  total: number | string;
  currency: string;
  cargoTrackingNumber: string | null;
  cargoProvider: string | null;
  createdAt: string;
  store: { name: string; slug: string };
  items: OrderItem[];
};

function OrdersFallback() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-64 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-64 animate-pulse rounded-lg bg-muted/50" />
      </div>
    </div>
  );
}

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
    if (status && status !== 'all') params.set('status', status);
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
  }, [storeId, status, page]);

  useEffect(() => {
    if (!orderIdFromUrl) return;
    const inList = data?.orders?.find((o) => o.id === orderIdFromUrl);
    if (inList) {
      setSelectedOrder(inList);
      return;
    }
    fetch(`/api/orders/${orderIdFromUrl}`)
      .then((r) => r.json())
      .then((order) => {
        if (order?.id) setSelectedOrder(order);
      })
      .catch(() => {});
  }, [orderIdFromUrl, data?.orders]);

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
          setSelectedOrder((prev) =>
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
      ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(Number(v))
      : '–';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Siparişler</h1>
          <p className="text-muted-foreground">
            Tüm kanallardan (B2C, B2B, pazaryeri) gelen siparişler. Listeden bir sipariş seçerek detayını görün.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mağaza</span>
              <Select value={storeId} onValueChange={(v) => { setStoreId(v); setPage(1); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm mağazalar</SelectItem>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Durum</span>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm durumlar</SelectItem>
                  {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Sipariş listesi
            </CardTitle>
            <CardDescription>
              Toplam {data?.total ?? 0} sipariş · Sayfa {data?.page ?? 1} / {totalPages || 1}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
                <p className="text-sm text-muted-foreground">Yükleniyor…</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20">
                <Package className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">Henüz sipariş yok</p>
                <p className="text-center text-sm text-muted-foreground">
                  Pazaryeri veya B2C kanallarından gelen siparişler burada listelenir.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className={`rounded-lg border p-4 text-left transition-colors hover:bg-muted/60 ${
                        selectedOrder?.id === order.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">#{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">{order.store.name}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {order.platform && (
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${PLATFORM_COLOR[order.platform] ?? PLATFORM_COLOR.OTHER}`}
                            >
                              {PLATFORM_LABELS[order.platform] ?? order.platform}
                            </Badge>
                          )}
                          <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? 'secondary'}>
                            {ORDER_STATUS_LABEL[order.status] ?? order.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {order.customerName || order.customerEmail || '—'}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {toPrice(order.total, order.currency)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </button>
                  ))}
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

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-base">Sipariş detayı</CardTitle>
            <CardDescription>
              {selectedOrder ? `#${selectedOrder.orderNumber}` : 'Listeden bir sipariş seçin'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedOrder ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 py-8">
                <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Sipariş seçilmedi</p>
                <p className="text-center text-xs text-muted-foreground">
                  Soldaki listeden bir siparişe tıklayın
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.platform && (
                    <Badge
                      variant="outline"
                      className={PLATFORM_COLOR[selectedOrder.platform] ?? PLATFORM_COLOR.OTHER}
                    >
                      {PLATFORM_LABELS[selectedOrder.platform] ?? selectedOrder.platform}
                    </Badge>
                  )}
                  <Badge variant={ORDER_STATUS_VARIANT[selectedOrder.status] ?? 'secondary'}>
                    {ORDER_STATUS_LABEL[selectedOrder.status] ?? selectedOrder.status}
                  </Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mağaza</span>
                    <span>{selectedOrder.store.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Müşteri</span>
                    <span>{selectedOrder.customerName || selectedOrder.customerEmail || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Toplam</span>
                    <span className="font-semibold">{toPrice(selectedOrder.total, selectedOrder.currency)}</span>
                  </div>
                  {(selectedOrder.cargoProvider || selectedOrder.cargoTrackingNumber) && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Truck className="h-3.5 w-3" /> Kargo
                      </span>
                      <span className="text-right text-xs">
                        {selectedOrder.cargoProvider && `${selectedOrder.cargoProvider} · `}
                        {selectedOrder.cargoTrackingNumber || '—'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium flex items-center gap-1">
                    <Package className="h-3.5 w-3" /> Kalemler
                  </p>
                  <ul className="rounded-md border divide-y">
                    {selectedOrder.items.map((item) => (
                      <li key={item.id} className="flex justify-between px-3 py-2 text-sm">
                        <span>{item.name} × {item.quantity}</span>
                        <span>{toPrice(item.total, selectedOrder.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-sm text-muted-foreground">Durum</span>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(v) => updateOrderStatus(selectedOrder.id, v)}
                    disabled={updating}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
