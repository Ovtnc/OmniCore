'use client';

import { useEffect, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StoreOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; path: string };

export type ProductFormValues = {
  storeId: string;
  name: string;
  sku: string;
  slug: string;
  shortDescription: string;
  description: string;
  barcode: string;
  brand: string;
  listPrice: string;
  salePrice: string;
  costPrice: string;
  taxRate: string;
  stockQuantity: string;
  lowStockThreshold: string;
  trackInventory: boolean;
  isActive: boolean;
  isB2bEligible: boolean;
  categoryIds: string[];
  imageUrls: string[];
  trendyolBrandId: string;
  trendyolCategoryId: string;
};

const emptyForm: ProductFormValues = {
  storeId: '',
  name: '',
  sku: '',
  slug: '',
  shortDescription: '',
  description: '',
  barcode: '',
  brand: '',
  listPrice: '',
  salePrice: '',
  costPrice: '',
  taxRate: '18',
  stockQuantity: '0',
  lowStockThreshold: '5',
  trackInventory: true,
  isActive: true,
  isB2bEligible: false,
  categoryIds: [],
  imageUrls: [''],
  trendyolBrandId: '',
  trendyolCategoryId: '',
};

type ProductFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  defaultStoreId?: string;
  stores: StoreOption[];
  onSuccess: () => void;
};

export function ProductFormSheet({
  open,
  onOpenChange,
  productId,
  defaultStoreId = '',
  stores,
  onSuccess,
}: ProductFormSheetProps) {
  const [form, setForm] = useState<ProductFormValues>({ ...emptyForm, storeId: defaultStoreId });
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!productId;

  useEffect(() => {
    if (!open) return;
    if (productId) {
      setLoadingProduct(true);
      setError(null);
      fetch(`/api/products/${productId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) throw new Error(d.error);
          setForm({
            storeId: d.storeId ?? d.store?.id ?? '',
            name: d.name ?? '',
            sku: d.sku ?? '',
            slug: d.slug ?? '',
            shortDescription: d.shortDescription ?? '',
            description: d.description ?? '',
            barcode: d.barcode ?? '',
            brand: d.brand ?? '',
            listPrice: String(d.listPrice ?? 0),
            salePrice: String(d.salePrice ?? 0),
            costPrice: d.costPrice != null ? String(d.costPrice) : '',
            taxRate: String(d.taxRate ?? 18),
            stockQuantity: String(d.stockQuantity ?? 0),
            lowStockThreshold: String(d.lowStockThreshold ?? 5),
            trackInventory: d.trackInventory !== false,
            isActive: d.isActive !== false,
            isB2bEligible: d.isB2bEligible === true,
            categoryIds: d.categoryIds ?? [],
            imageUrls: Array.isArray(d.imageUrls) && d.imageUrls.length > 0 ? d.imageUrls : [''],
            trendyolBrandId: d.trendyolBrandId != null ? String(d.trendyolBrandId) : '',
            trendyolCategoryId: d.trendyolCategoryId != null ? String(d.trendyolCategoryId) : '',
          });
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Ürün yüklenemedi'))
        .finally(() => setLoadingProduct(false));
    } else {
      setForm({ ...emptyForm, storeId: defaultStoreId || stores[0]?.id || '' });
      setError(null);
    }
  }, [open, productId, defaultStoreId, stores]);

  useEffect(() => {
    const sid = form.storeId;
    if (!sid) {
      setCategories([]);
      return;
    }
    fetch(`/api/stores/${sid}/categories`)
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setCategories(d) : setCategories([])))
      .catch(() => setCategories([]));
  }, [form.storeId]);

  const update = (updates: Partial<ProductFormValues>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const toggleCategory = (id: string) => {
    setForm((prev) => {
      const has = prev.categoryIds.includes(id);
      const next = has
        ? prev.categoryIds.filter((c) => c !== id)
        : [...prev.categoryIds, id];
      return { ...prev, categoryIds: next };
    });
  };

  const addImageUrl = () => {
    setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ''] }));
  };
  const setImageUrl = (index: number, url: string) => {
    setForm((prev) => {
      const next = [...prev.imageUrls];
      next[index] = url;
      return { ...prev, imageUrls: next };
    });
  };
  const removeImageUrl = (index: number) => {
    setForm((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        storeId: form.storeId,
        name: form.name.trim(),
        sku: form.sku.trim(),
        slug: form.slug.trim() || undefined,
        shortDescription: form.shortDescription.trim() || undefined,
        description: form.description.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        brand: form.brand.trim() || undefined,
        listPrice: parseFloat(form.listPrice) || 0,
        salePrice: parseFloat(form.salePrice) || 0,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
        taxRate: parseFloat(form.taxRate) || 18,
        stockQuantity: parseInt(form.stockQuantity, 10) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold, 10) ?? 5,
        trackInventory: form.trackInventory,
        isActive: form.isActive,
        isB2bEligible: form.isB2bEligible,
        categoryIds: form.categoryIds,
        imageUrls: form.imageUrls.filter((u) => u.trim()),
      };

      if (productId) {
        const raw = payload as Record<string, unknown>;
        raw.trendyolBrandId = form.trendyolBrandId.trim()
          ? parseInt(form.trendyolBrandId, 10)
          : null;
        raw.trendyolCategoryId = form.trendyolCategoryId.trim()
          ? parseInt(form.trendyolCategoryId, 10)
          : null;
      }

      if (!payload.name || !payload.sku) {
        setError('Ürün adı ve SKU gerekli');
        setSaving(false);
        return;
      }

      const url = productId ? `/api/products/${productId}` : '/api/products';
      const method = productId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kaydetme başarısız');
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-xl overflow-y-auto" showClose>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEdit ? 'Ürünü düzenle' : 'Yeni ürün'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Ürün bilgilerini güncelleyin.'
              : 'Mağaza seçin ve ürün bilgilerini girin.'}
          </SheetDescription>
        </SheetHeader>

        {loadingProduct ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Mağaza</Label>
              <Select
                value={form.storeId}
                onValueChange={(v) => update({ storeId: v })}
                disabled={isEdit}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mağaza seçin" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Ürün adı *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Örn. Pamuklu Tişört"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => update({ sku: e.target.value })}
                  placeholder="Örn. TIS-001"
                  required
                  disabled={isEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (boş bırakılırsa addan üretilir)</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => update({ slug: e.target.value })}
                placeholder="pamuklu-tisort"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">Kısa açıklama</Label>
              <Input
                id="shortDescription"
                value={form.shortDescription}
                onChange={(e) => update({ shortDescription: e.target.value })}
                placeholder="Max 500 karakter"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Ürün detayları"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="barcode">Barkod</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => update({ barcode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marka</Label>
                <Input
                  id="brand"
                  value={form.brand}
                  onChange={(e) => update({ brand: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="listPrice">Liste fiyatı (TRY)</Label>
                <Input
                  id="listPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.listPrice}
                  onChange={(e) => update({ listPrice: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salePrice">Satış fiyatı (TRY)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salePrice}
                  onChange={(e) => update({ salePrice: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="costPrice">Maliyet (TRY)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => update({ costPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">KDV oranı (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.taxRate}
                  onChange={(e) => update({ taxRate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stok adedi</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  min="0"
                  value={form.stockQuantity}
                  onChange={(e) => update({ stockQuantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Düşük stok uyarı eşiği</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  value={form.lowStockThreshold}
                  onChange={(e) => update({ lowStockThreshold: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.trackInventory}
                  onCheckedChange={(c) => update({ trackInventory: !!c })}
                />
                <span className="text-sm">Stok takibi</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.isActive}
                  onCheckedChange={(c) => update({ isActive: !!c })}
                />
                <span className="text-sm">Aktif</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.isB2bEligible}
                  onCheckedChange={(c) => update({ isB2bEligible: !!c })}
                />
                <span className="text-sm">B2B uygun</span>
              </label>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <Label className="text-sm font-medium">Trendyol (pazaryerine gönderim için)</Label>
              <p className="text-xs text-muted-foreground">
                Marka ve kategori ID&apos;lerini Trendyol Satıcı Paneli veya API dokümanından alın. Boş bırakılırsa ürün Trendyol&apos;a gönderilemez.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trendyolBrandId" className="text-muted-foreground font-normal">Marka ID</Label>
                  <Input
                    id="trendyolBrandId"
                    type="number"
                    min="1"
                    placeholder="Örn. 123"
                    value={form.trendyolBrandId}
                    onChange={(e) => update({ trendyolBrandId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trendyolCategoryId" className="text-muted-foreground font-normal">Kategori ID</Label>
                  <Input
                    id="trendyolCategoryId"
                    type="number"
                    min="1"
                    placeholder="Örn. 456"
                    value={form.trendyolCategoryId}
                    onChange={(e) => update({ trendyolCategoryId: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Kategoriler (ilk seçilen ana kategori)</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                  {categories.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2">
                      <Checkbox
                        checked={form.categoryIds.includes(c.id)}
                        onCheckedChange={() => toggleCategory(c.id)}
                      />
                      <span className="text-sm">{c.path}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Görsel URL&apos;leri</Label>
              {form.imageUrls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => setImageUrl(i, e.target.value)}
                    placeholder="https://..."
                  />
                  {form.imageUrls.length > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeImageUrl(i)}
                    >
                      −
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addImageUrl}>
                + Görsel ekle
              </Button>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor…
                  </>
                ) : isEdit ? (
                  'Güncelle'
                ) : (
                  'Oluştur'
                )}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
