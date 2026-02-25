'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';

type Period = 'day' | 'week' | 'month';

type AnalyticsData = {
  revenueTimeSeries: { date: string; revenue: number; count: number }[];
  topProducts: { productId: string; name: string; sku: string; quantitySold: number; revenue: number }[];
  lowStockProducts: { id: string; name: string; sku: string; stockQuantity: number; listPrice: number; salePrice: number }[];
  byPlatform: { platform: string; label: string; count: number; revenue: number }[];
  summary: { orderCount: number; totalRevenue: number; productCount: number; lowStockCount: number };
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(262, 83%, 58%)',
  'hsl(47, 96%, 53%)',
  'hsl(0, 84%, 60%)',
  'hsl(199, 89%, 48%)',
];

function formatTRY(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
}

function formatDate(label: string, period: Period) {
  const d = new Date(label);
  if (period === 'month') return d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
  if (period === 'week') return `Hafta ${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('day');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const exportCSV = useCallback(() => {
    if (!data) return;
    const rows: string[][] = [
      ['Rapor', 'OmniCore Analitik'],
      [],
      ['Özet', ''],
      ['Toplam Sipariş', String(data.summary.orderCount)],
      ['Toplam Ciro (₺)', String(data.summary.totalRevenue)],
      ['Ürün Sayısı', String(data.summary.productCount)],
      ['Düşük Stok', String(data.summary.lowStockCount)],
      [],
      ['Ciro Zaman Serisi', ''],
      ['Tarih', 'Ciro (₺)', 'Sipariş Sayısı'],
      ...data.revenueTimeSeries.map((r) => [r.date, String(r.revenue), String(r.count)]),
      [],
      ['En Çok Satan Ürünler', ''],
      ['SKU', 'Ürün', 'Adet', 'Ciro (₺)'],
      ...data.topProducts.map((p) => [p.sku, p.name, String(p.quantitySold), String(p.revenue)]),
      [],
      ['Düşük Stok Ürünler', ''],
      ['SKU', 'Ürün', 'Stok'],
      ...data.lowStockProducts.map((p) => [p.sku, p.name, String(p.stockQuantity)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnicore-rapor-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const exportExcel = useCallback(() => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Özet'],
        ['Toplam Sipariş', data.summary.orderCount],
        ['Toplam Ciro (₺)', data.summary.totalRevenue],
        ['Ürün Sayısı', data.summary.productCount],
        ['Düşük Stok', data.summary.lowStockCount],
        [],
        ['Ciro Zaman Serisi'],
        ['Tarih', 'Ciro (₺)', 'Sipariş Sayısı'],
        ...data.revenueTimeSeries.map((r) => [r.date, r.revenue, r.count]),
      ]),
      'Özet'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['SKU', 'Ürün', 'Adet', 'Ciro (₺)'],
        ...data.topProducts.map((p) => [p.sku, p.name, p.quantitySold, p.revenue]),
      ]),
      'En Çok Satanlar'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['SKU', 'Ürün', 'Stok', 'Liste Fiyat', 'Satış Fiyat'],
        ...data.lowStockProducts.map((p) => [p.sku, p.name, p.stockQuantity, p.listPrice, p.salePrice]),
      ]),
      'Düşük Stok'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Platform', 'Sipariş', 'Ciro (₺)'],
        ...data.byPlatform.map((p) => [p.label, p.count, p.revenue]),
      ]),
      'Pazaryeri'
    );
    XLSX.writeFile(wb, `omnicore-rapor-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Analitik ve Raporlama</h1>
          <p className="text-muted-foreground">
            Ciro, ürün performansı ve pazaryeri dağılımı — işlerinizin özeti.
          </p>
        </div>
        {!loading && data && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <FileText className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        )}
      </div>

      {/* Özet kartlar */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))
        ) : data ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Sipariş</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.orderCount}</div>
                <p className="text-xs text-muted-foreground">İptal/İade hariç</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Ciro</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTRY(data.summary.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">Tüm zamanlar</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Ürün</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.productCount}</div>
                <p className="text-xs text-muted-foreground">Katalog</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Düşük Stok</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.lowStockCount}</div>
                <p className="text-xs text-muted-foreground">Eşik altı (≤5)</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="col-span-full text-sm text-muted-foreground">Veri yüklenemedi.</p>
        )}
      </div>

      {/* Ciro grafiği */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Ciro Değişimi
            </CardTitle>
            <CardDescription>Günlük, haftalık veya aylık ciro ve sipariş sayısı</CardDescription>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="day">Günlük</TabsTrigger>
              <TabsTrigger value="week">Haftalık</TabsTrigger>
              <TabsTrigger value="month">Aylık</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[320px] w-full rounded-lg" />
          ) : data && data.revenueTimeSeries.length > 0 ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.revenueTimeSeries.map((r) => ({
                    ...r,
                    label: formatDate(r.date, period),
                    fullDate: r.date,
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate}
                    formatter={(value: number) => [formatTRY(value), 'Ciro']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
              <p className="text-sm text-muted-foreground">Henüz sipariş verisi yok.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pazaryeri dağılımı */}
        <Card>
          <CardHeader>
            <CardTitle>Pazaryeri Dağılımı</CardTitle>
            <CardDescription>Satışların platformlara göre dağılımı (ciro)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full rounded-lg" />
            ) : data && data.byPlatform.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byPlatform}
                      dataKey="revenue"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.byPlatform.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number, name, props) => [formatTRY(value), props.payload.label]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
                <p className="text-sm text-muted-foreground">Henüz platform verisi yok.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* En çok satan ürünler */}
        <Card>
          <CardHeader>
            <CardTitle>En Çok Satan Ürünler</CardTitle>
            <CardDescription>Ciroya göre ilk 15 ürün</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data && data.topProducts.length > 0 ? (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün / SKU</TableHead>
                      <TableHead className="text-right">Adet</TableHead>
                      <TableHead className="text-right">Ciro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProducts.map((p) => (
                      <TableRow key={p.productId}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">{p.quantitySold}</TableCell>
                        <TableCell className="text-right">{formatTRY(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
                <p className="text-sm text-muted-foreground">Henüz sipariş verisi yok.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stoku azalan ürünler */}
      <Card>
        <CardHeader>
          <CardTitle>Stoku Azalan Ürünler</CardTitle>
          <CardDescription>Stok miktarı 10 ve altındaki ürünler</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data && data.lowStockProducts.length > 0 ? (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün / SKU</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="text-right">Satış Fiyatı</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStockProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.sku}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={p.stockQuantity <= 5 ? 'font-semibold text-destructive' : ''}>
                          {p.stockQuantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatTRY(p.salePrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
              <p className="text-sm text-muted-foreground">Düşük stoklu ürün yok.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
