'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Search, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type PreviewItem = {
  id: string;
  sku: string;
  name: string;
  listPrice: number;
  salePrice: number;
  stockQuantity: number;
  barcode: string | null;
  brand: string | null;
  categoryName: string | null;
  trendyolBrandId: number | null;
  trendyolCategoryId: number | null;
  imageUrls: string[];
};

type ProductPreviewTableProps = {
  items: PreviewItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onPageChange: (page: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  loading?: boolean;
  /** Import sırasında hangi satırın yüklendiği (id -> 'loading' | 'success') */
  rowStatus?: Record<string, 'loading' | 'success'>;
  /** Hızlı filtre: sadece stokta olanları seç */
  onSelectInStock?: () => void;
  /** Hızlı filtre: fiyatı minPrice TL üzeri seç */
  onSelectPriceAbove?: (minPrice: number) => void;
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];

/** Dış CDN görselleri CORS engeline takılmasın diye proxy üzerinden gösterir. */
function PreviewImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const isExternal = /^https?:\/\//i.test(src);
  const url = isExternal ? `/api/proxy-image?url=${encodeURIComponent(src)}` : src;
  return <img src={url} alt={alt} className={className} referrerPolicy="no-referrer" />;
}

export function ProductPreviewTable({
  items,
  total,
  page,
  totalPages,
  limit,
  selectedIds,
  onSelectionChange,
  onPageChange,
  searchQuery,
  onSearchChange,
  loading,
  rowStatus = {},
  onSelectInStock,
  onSelectPriceAbove,
}: ProductPreviewTableProps) {
  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someSelected = items.some((i) => selectedIds.has(i.id));
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const toggleOne = useCallback(
    (id: string) => {
      onSelectionChange(
        (() => {
          const next = new Set(selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        })()
      );
    },
    [selectedIds, onSelectionChange]
  );

  const toggleAll = useCallback(() => {
    if (allSelected) {
      const remove = new Set(items.map((i) => i.id));
      onSelectionChange(
        new Set([...selectedIds].filter((id) => !remove.has(id)))
      );
    } else {
      const add = new Set(items.map((i) => i.id));
      onSelectionChange(new Set([...selectedIds, ...add]));
    }
  }, [items, selectedIds, allSelected, onSelectionChange]);

  const toPrice = (v: number) =>
    Number.isFinite(v) ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v) : '–';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Ürün Ön İzleme
        </CardTitle>
        <CardDescription>
          Sisteme aktarmak istediğiniz ürünleri işaretleyin. Seçmedikleriniz atılacaktır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Ürün adı veya SKU ile ara..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onSelectInStock && (
              <Button type="button" variant="outline" size="sm" onClick={onSelectInStock}>
                Sadece stokta olanları seç
              </Button>
            )}
            {onSelectPriceAbove && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectPriceAbove(100)}
              >
                Fiyatı 100 TL üzeri seç
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {searchQuery ? 'Arama kriterine uygun ürün yok.' : 'Bu batch\'te ürün bulunamadı.'}
          </p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox
                        ref={selectAllRef}
                        checked={allSelected}
                        onCheckedChange={() => toggleAll()}
                        aria-label="Tümünü seç / Kaldır"
                      />
                    </TableHead>
                    <TableHead className="font-medium">Ürün</TableHead>
                    <TableHead className="font-medium">SKU / Barkod</TableHead>
                    <TableHead className="font-medium">Kategori</TableHead>
                    <TableHead className="font-medium text-center">Trendyol Marka ID</TableHead>
                    <TableHead className="font-medium text-center">Trendyol Kategori ID</TableHead>
                    <TableHead className="text-right font-medium">Satış fiyatı</TableHead>
                    <TableHead className="text-right font-medium">Stok</TableHead>
                    <TableHead className="w-24 font-medium">Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => {
                    const status = rowStatus[row.id];
                    return (
                      <TableRow key={row.id} className="hover:bg-muted/30">
                        <TableCell className="w-12">
                          <Checkbox
                            checked={selectedIds.has(row.id)}
                            onCheckedChange={() => toggleOne(row.id)}
                            aria-label={`${row.name} seç`}
                            disabled={status === 'loading'}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {row.imageUrls[0] ? (
                              <PreviewImage src={row.imageUrls[0]} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{row.name}</p>
                              {row.brand && (
                                <p className="text-xs text-muted-foreground">{row.brand}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="font-mono text-xs">{row.sku}</span>
                          {row.barcode && <span className="ml-1 text-xs">/ {row.barcode}</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.categoryName ?? '–'}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground text-sm font-mono">
                          {row.trendyolBrandId != null ? row.trendyolBrandId : '–'}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground text-sm font-mono">
                          {row.trendyolCategoryId != null ? row.trendyolCategoryId : '–'}
                        </TableCell>
                        <TableCell className="text-right">{toPrice(row.salePrice)}</TableCell>
                        <TableCell className="text-right">
                          <span className={row.stockQuantity <= 0 ? 'text-destructive font-medium' : ''}>
                            {row.stockQuantity}
                          </span>
                        </TableCell>
                        <TableCell className="w-24">
                          {status === 'loading' && (
                            <span className="text-xs text-muted-foreground">Yükleniyor…</span>
                          )}
                          {status === 'success' && (
                            <span className="text-xs text-green-600 font-medium">Aktarıldı</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Toplam {total} ürün • Sayfa {page} / {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
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
                    onClick={() => onPageChange(page + 1)}
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
  );
}
