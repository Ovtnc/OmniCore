'use client';

import { useEffect, useState } from 'react';
import { Upload, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BrandChip } from '@/components/ui/brand-chip';

type Connection = { id: string; platform: string; label: string; isActive?: boolean };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  categoryId: string;
  categoryName: string;
  onSuccess?: () => void;
};

export function CategoryUploadDialog({
  open,
  onOpenChange,
  storeId,
  categoryId,
  categoryName,
  onSuccess,
}: Props) {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [missingBarcodeCount, setMissingBarcodeCount] = useState(0);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !storeId) return;
    setSuccessMessage(null);
    setLoading(true);
    setError(null);
    fetch(`/api/stores/${storeId}/category-products?categoryId=${encodeURIComponent(categoryId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProductIds(data.productIds ?? []);
        setMissingBarcodeCount(data.missingBarcodeCount ?? 0);
        const conns = data.connections ?? [];
        setConnections(conns);
        setSelectedConnectionIds(new Set(conns.filter((c: Connection) => c.isActive !== false).map((c: Connection) => c.id)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [open, storeId, categoryId]);

  const handleToggleConnection = (id: string) => {
    setSelectedConnectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (productIds.length === 0) {
      setError('Bu kategoride yüklenecek ürün yok.');
      return;
    }
    if (selectedConnectionIds.size === 0) {
      setError('En az bir pazaryeri bağlantısı seçin.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/marketplace-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds,
          connectionIds: Array.from(selectedConnectionIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gönderilemedi');
      setSuccessMessage(data.message ?? `${productIds.length} ürün kuyruğa eklendi.`);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Pazaryerine Gönder
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{categoryName}</span> kategorisindeki ürünleri seçtiğiniz
            pazaryerlerine toplu yükleyin. İşlem arka planda kuyrukta işlenir.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Ürünler ve bağlantılar yükleniyor...</span>
          </div>
        ) : successMessage ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-3 text-sm text-green-800 dark:text-green-200">
              <p className="font-medium">{successMessage}</p>
              <p className="text-xs opacity-90">
                Worker çalışmıyorsa ürünler pazaryerine gitmez. Ayrı bir terminalde <code className="rounded bg-muted px-1">pnpm run queue:dev</code> çalıştırın (Redis gerekir).
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">
                <span className="text-foreground">{productIds.length}</span> ürün kuyruğa eklenecek
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bu kategorideki <strong>tüm</strong> ürünler gönderilir. Sadece belirli ürünleri göndermek için Ürünler → Liste görünümünde ürünleri işaretleyip pazaryerine gönderin.
              </p>
              {missingBarcodeCount > 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {missingBarcodeCount} ürünün barkodu eksik; bazı pazaryerleri reddedebilir.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Hedef pazaryerleri</Label>
              {connections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Bu mağaza için pazaryeri bağlantısı yok. Önce Pazaryeri sayfasından bağlantı ekleyin.
                </p>
              ) : (
                <div className="flex flex-col gap-2 rounded-md border p-3">
                  {connections.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedConnectionIds.has(c.id)}
                        onCheckedChange={() => handleToggleConnection(c.id)}
                      />
                      <span className="text-sm font-medium">
                        <BrandChip code={c.platform} label={c.label} />
                      </span>
                      {c.isActive === false && (
                        <span className="text-xs text-muted-foreground">(Aktif değil)</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {successMessage ? (
            <Button onClick={() => { setSuccessMessage(null); onOpenChange(false); }}>
              Tamam
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                İptal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || submitting || productIds.length === 0 || selectedConnectionIds.size === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kuyruğa ekleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {productIds.length} ürünü kuyruğa ekle
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
