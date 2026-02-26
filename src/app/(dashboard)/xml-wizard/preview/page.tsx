'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Upload, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProductPreviewTable, type PreviewItem } from '@/components/xml-wizard/ProductPreviewTable';

const LIMIT = 20;

function XmlWizardPreviewFallback() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted/50" />
    </div>
  );
}

function XmlWizardPreviewContent() {
  const searchParams = useSearchParams();
  const batchId = searchParams.get('batchId') ?? '';

  const [items, setItems] = useState<PreviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, 'loading' | 'success'>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    setFetchError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
    const params = new URLSearchParams();
    params.set('batchId', batchId);
    params.set('page', String(page));
    params.set('limit', String(LIMIT));
    if (debouncedQ) params.set('q', debouncedQ);
    fetch(`/api/xml-import/preview?${params}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) {
          return r.json().then((d) => ({ error: d?.error ?? `Hata ${r.status}` }));
        }
        return r.json();
      })
      .then((d) => {
        if ('error' in d && d.error) {
          setFetchError(d.error);
          setItems([]);
          setTotal(0);
          setTotalPages(0);
          return;
        }
        setFetchError(null);
        if (d.items) {
          setItems(d.items);
          setTotal(d.total ?? 0);
          setTotalPages(d.totalPages ?? 0);
        } else {
          setItems([]);
          setTotal(0);
          setTotalPages(0);
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') {
          setFetchError('İstek zaman aşımına uğradı. Sayfayı yenileyip tekrar deneyin.');
        } else {
          setFetchError('Ön izleme yüklenemedi. Ağ hatası veya sunucu yanıt vermiyor.');
        }
        setItems([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [batchId, page, debouncedQ]);

  const handleFinalImport = useCallback(async () => {
    if (!batchId || selectedIds.size === 0) return;
    setConfirmOpen(false);
    setImporting(true);
    setImportResult(null);
    const ids = Array.from(selectedIds);
    ids.forEach((id) => setRowStatus((s) => ({ ...s, [id]: 'loading' })));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      const res = await fetch('/api/xml-import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, productIds: ids }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aktarım başarısız');
      ids.forEach((id) => setRowStatus((s) => ({ ...s, [id]: 'success' })));
      setImportResult({ success: true, message: data.message || `${ids.length} ürün aktarıldı.` });
      setSelectedIds(new Set());
      const newTotal = Math.max(0, total - ids.length);
      setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      setTotal(newTotal);
      setTotalPages(Math.ceil(newTotal / LIMIT));
    } catch (e) {
      const msg =
        e instanceof Error && e.name === 'AbortError'
          ? 'İstek çok uzun sürdü (90 sn). Sunucu yanıt vermedi; tekrar deneyin.'
          : e instanceof Error ? e.message : 'Aktarım başarısız';
      setImportResult({ success: false, message: msg });
      setRowStatus((s) => {
        const next = { ...s };
        ids.forEach((id) => delete next[id]);
        return next;
      });
    } finally {
      clearTimeout(timeoutId);
      setImporting(false);
    }
  }, [batchId, selectedIds, total]);

  const onSelectInStock = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      items.filter((i) => i.stockQuantity > 0).forEach((i) => next.add(i.id));
      return next;
    });
  }, [items]);

  const onSelectPriceAbove = useCallback(
    (minPrice: number) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        items.filter((i) => i.salePrice >= minPrice).forEach((i) => next.add(i.id));
        return next;
      });
    },
    [items]
  );

  if (!batchId) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Geçersiz ön izleme. Lütfen XML Sihirbazından seçimli içe aktarım başlatın.</p>
        <Button asChild variant="outline">
          <Link href="/xml-wizard">XML Sihirbazına dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ürün Ön İzleme ve Seçimli Kayıt</h1>
          <p className="text-muted-foreground">
            Sisteme aktarmak istediğiniz ürünleri işaretleyin, sonra &quot;Seçili ürünleri sisteme aktar&quot; ile onaylayın.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/xml-wizard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Sihirbaza dön
          </Link>
        </Button>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {fetchError}
        </div>
      )}

      {importResult && (
        <div
          className={
            importResult.success
              ? 'flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200'
              : 'flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive'
          }
        >
          {importResult.success ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : null}
          <p className="text-sm font-medium">{importResult.message}</p>
          {importResult.success && (
            <Button asChild variant="outline" size="sm" className="ml-auto">
              <Link href="/products">Ürünlere git</Link>
            </Button>
          )}
        </div>
      )}
      <ProductPreviewTable
        items={items}
        total={total}
        page={page}
        totalPages={totalPages}
        limit={LIMIT}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onPageChange={setPage}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        rowStatus={rowStatus}
        onSelectInStock={onSelectInStock}
        onSelectPriceAbove={onSelectPriceAbove}
      />

      {/* Sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:left-[280px]">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selectedIds.size}</span> ürün seçili
          </p>
          <Button
            size="lg"
            disabled={selectedIds.size === 0 || importing}
            onClick={() => setConfirmOpen(true)}
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Seçili {selectedIds.size} Ürünü Sisteme Aktar
          </Button>
        </div>
      </div>

      {/* Onay modalı */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aktarımı onayla</DialogTitle>
            <DialogDescription>
              Şu an <strong>{selectedIds.size} ürün</strong> seçili. Bu ürünler kalıcı kataloğa eklenecek ve
              Hızlı Senkronizasyon listesine düşecektir. Pazaryerine gönderim manuel olarak sizden başlatılır.
              Seçmediğiniz ürünler atılacaktır. Devam etmek istiyor musunuz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleFinalImport}>
              Evet, aktar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function XmlWizardPreviewPage() {
  return (
    <Suspense fallback={<XmlWizardPreviewFallback />}>
      <XmlWizardPreviewContent />
    </Suspense>
  );
}
