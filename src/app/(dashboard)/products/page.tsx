'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Package,
  Search,
  Store,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  FolderTree,
  List,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CatalogExplorer } from '@/components/products/CatalogExplorer';
import { ProductFormSheet } from '@/components/products/ProductFormSheet';

type StoreOption = { id: string; name: string; slug: string };
type Product = {
  id: string;
  storeId: string;
  sku: string;
  name: string;
  slug: string;
  listPrice: number | string;
  salePrice: number | string;
  stockQuantity: number;
  isActive: boolean;
  brand: string | null;
  barcode: string | null;
  createdAt: string;
  updatedAt: string;
  store: { name: string; slug: string };
  images: { url: string }[];
};

function ProductsPageFallback() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted/50" />
    </div>
  );
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const viewMode = searchParams.get('view') === 'list' ? 'list' : 'folder';

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setStores(d) : setStores([])));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (storeId && storeId !== 'all') params.set('storeId', storeId);
    if (debouncedSearch) params.set('q', debouncedSearch);
    params.set('page', String(page));
    params.set('limit', '20');
    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.products) setData(d);
        else setData({ products: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      })
      .catch(() => setData({ products: [], total: 0, page: 1, limit: 20, totalPages: 0 }))
      .finally(() => setLoading(false));
  }, [storeId, debouncedSearch, page, refreshKey]);

  const toPrice = (v: number | string) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n) : '–';
  };

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const products = data?.products ?? [];
  const canSendToMarketplace = storeId && storeId !== 'all' && selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleSendToMarketplace = async () => {
    if (!storeId || storeId === 'all' || selectedIds.size === 0) return;
    setSendMessage(null);
    setSending(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/marketplace-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gönderilemedi');
      setSendMessage({ type: 'success', text: data.message || `${selectedIds.size} ürün kuyruğa eklendi.` });
      setSelectedIds(new Set());
    } catch (e) {
      setSendMessage({ type: 'error', text: e instanceof Error ? e.message : 'Gönderilemedi' });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeletingId(productToDelete.id);
    setSendMessage(null);
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ürün silinemedi');
      setProductToDelete(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(productToDelete.id);
        return next;
      });
      setRefreshKey((k) => k + 1);
      setSendMessage({ type: 'success', text: 'Ürün silindi.' });
    } catch (e) {
      setSendMessage({ type: 'error', text: e instanceof Error ? e.message : 'Ürün silinemedi' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    setSendMessage(null);
    try {
      const res = await fetch('/api/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Silme başarısız');
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
      setSendMessage({ type: 'success', text: data.message || `${data.deleted ?? 0} ürün silindi.` });
    } catch (e) {
      setSendMessage({ type: 'error', text: e instanceof Error ? e.message : 'Silme başarısız' });
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ürünler</h1>
          <p className="text-muted-foreground">
            Katalog, stok ve pazaryeri eşleştirmeleri. Mağaza ve kategori klasörlerine tıklayarak gezinin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'folder' ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/products?view=list">
                <List className="mr-2 h-4 w-4" />
                Liste görünümü
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/products">
                <FolderTree className="mr-2 h-4 w-4" />
                Klasör görünümü
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/categories">
              <FolderTree className="mr-2 h-4 w-4" />
              Kategoriler
            </Link>
          </Button>
          <Button
            onClick={() => {
              setEditingProductId(null);
              setProductFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Yeni ürün
          </Button>
          <Button variant="outline" asChild>
            <Link href="/xml-wizard">
              <FileCode2 className="mr-2 h-4 w-4" />
              XML Sihirbazı
            </Link>
          </Button>
        </div>
      </div>

      {viewMode === 'folder' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Katalog gezgini
            </CardTitle>
            <CardDescription>
              Mağazalar ve kategoriler klasör gibi açılır; ürünler grid olarak listelenir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CatalogExplorer />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ürün kataloğu
            </CardTitle>
            <CardDescription>
              XML sihirbazından yüklenen ürünler burada listelenir. Mağaza seçin, yüklemek istediğiniz ürünleri işaretleyin ve &quot;Yüklemeyi başlat&quot; ile pazaryerine gönderin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Ürün adı, SKU veya barkod ile ara..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={storeId}
              onValueChange={(v) => {
                setStoreId(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <Store className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tüm mağazalar" />
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

          {selectedIds.size > 0 && !loading && products.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">{selectedIds.size}</strong> ürün seçili
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Seçilenleri sil
              </Button>
            </div>
          )}

          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Yükleniyor…</p>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">Henüz ürün yok</p>
                <p className="text-sm text-muted-foreground">
                  Yeni ürün ekleyin, XML import ile toplu yükleyin veya pazaryeri senkronundan ürünler gelsin.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setEditingProductId(null);
                    setProductFormOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni ürün
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/xml-wizard">
                    <FileCode2 className="mr-2 h-4 w-4" />
                    XML Sihirbazı
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 w-12">
                        <input
                          type="checkbox"
                          checked={products.length > 0 && selectedIds.size === products.length}
                          onChange={toggleSelectAll}
                          className="rounded border-input"
                          aria-label="Tümünü seç"
                        />
                      </th>
                      <th className="px-4 py-2 text-left font-medium">Ürün</th>
                      <th className="px-4 py-2 text-left font-medium">SKU / Barkod</th>
                      <th className="px-4 py-2 text-left font-medium">Mağaza</th>
                      <th className="px-4 py-2 text-right font-medium">Satış fiyatı</th>
                      <th className="px-4 py-2 text-right font-medium">Stok</th>
                      <th className="px-4 py-2 text-left font-medium">Durum</th>
                      <th className="px-4 py-2 w-24" aria-label="İşlem" />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 w-12">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="rounded border-input"
                            aria-label={`${p.name} seç`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.images?.[0]?.url ? (
                              <img
                                src={p.images[0].url}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{p.name}</p>
                              {p.brand && (
                                <p className="text-xs text-muted-foreground">{p.brand}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="font-mono text-xs">{p.sku}</span>
                          {p.barcode && (
                            <span className="ml-1 text-xs">/ {p.barcode}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.store.name}</td>
                        <td className="px-4 py-3 text-right">{toPrice(p.salePrice)}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={
                              p.stockQuantity <= 0
                                ? 'text-destructive font-medium'
                                : ''
                            }
                          >
                            {p.stockQuantity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              p.isActive
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {p.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProductId(p.id);
                                setProductFormOpen(true);
                              }}
                              aria-label="Düzenle"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setProductToDelete(p)}
                              disabled={deletingId === p.id}
                              aria-label="Sil"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {deletingId === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Toplam {total} ürün
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
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
      )}

      <ProductFormSheet
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        productId={editingProductId}
        defaultStoreId={storeId !== 'all' ? storeId : undefined}
        stores={stores}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <Dialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ürünü sil</DialogTitle>
            <DialogDescription>
              {productToDelete && (
                <>
                  <strong>{productToDelete.name}</strong> ürününü silmek istediğinize emin misiniz? Bu işlem geri
                  alınamaz.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductToDelete(null)} disabled={!!deletingId}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={!productToDelete || !!deletingId}
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Siliniyor…
                </>
              ) : (
                'Sil'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => !open && !bulkDeleting && setBulkDeleteOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seçilen ürünleri sil</DialogTitle>
            <DialogDescription>
              <strong>{selectedIds.size}</strong> ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              Siparişte kullanılan ürünler silinmeyecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Siliniyor…
                </>
              ) : (
                'Seçilenleri sil'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageFallback />}>
      <ProductsPageContent />
    </Suspense>
  );
}
