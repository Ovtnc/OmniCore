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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('batchId', batchId);
    params.set('page', String(page));
    params.set('limit', String(LIMIT));
    if (debouncedQ) params.set('q', debouncedQ);
    fetch(`/api/xml-import/preview?${params}`)
      .then((r) => r.json())
      .then((d) => {
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
      .catch(() => {
        setItems([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [batchId, page, debouncedQ]);

  const handleFinalImport = useCallback(async () => {
    if (!batchId || selectedIds.size === 0) return;
    setConfirmOpen(false);
    setImporting(true);
    setImportResult(null);
    const ids = Array.from(selectedIds);
    ids.forEach((id) => setRowStatus((s) => ({ ...s, [id]: 'loading' })));
    try {
      const res = await fetch('/api/xml-import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, productIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aktarım başarısız');
      ids.forEach((id) => setRowStatus((s) => ({ ...s, [id]: 'success' })));
      setImportResult({ success: true, message: data.message || `${ids.length} ürün aktarıldı.` });
      setSelectedIds(new Set());
    } catch (e) {
      setImportResult({
        success: false,
        message: e instanceof Error ? e.message : 'Aktarım başarısız',
      });
      setRowStatus((s) => {
        const next = { ...s };
        ids.forEach((id) => delete next[id]);
        return next;
      });
    } finally {
      setImporting(false);
    }
  }, [batchId, selectedIds]);

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
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex items-center justify-between gap-4 py-4">
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
              pazaryeri kuyruğuna gönderilecek. Seçmediğiniz ürünler atılacaktır. Devam etmek istiyor musunuz?
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
