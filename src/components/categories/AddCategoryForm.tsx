'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategoryIconPicker } from './category-icon-picker';
import { createCategory, getCategoriesFlatForSelect } from '@/app/actions/categories';

const formSchema = z.object({
  storeId: z.string().min(1, 'Mağaza seçin'),
  name: z.string().min(1, 'Kategori adı gerekli').max(255),
  parentId: z.string().nullable(),
  icon: z.string().nullable(),
});

type StoreOption = { id: string; name: string; slug: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: StoreOption[];
  defaultStoreId?: string;
  defaultParentId?: string | null;
  onSuccess?: () => void;
};

export function AddCategoryForm({
  open,
  onOpenChange,
  stores,
  defaultStoreId = '',
  defaultParentId = null,
  onSuccess,
}: Props) {
  const [storeId, setStoreId] = useState('');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [parentOptions, setParentOptions] = useState<{ id: string; name: string; path: string }[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStoreId((defaultStoreId || stores[0]?.id) ?? '');
    setName('');
    setParentId(defaultParentId ?? null);
    setIcon(null);
    setSubmitError(null);
    setFieldError(null);
  }, [open, defaultStoreId, defaultParentId, stores]);

  useEffect(() => {
    if (!storeId) {
      setParentOptions([]);
      return;
    }
    setLoadingParents(true);
    getCategoriesFlatForSelect(storeId)
      .then(setParentOptions)
      .finally(() => setLoadingParents(false));
  }, [storeId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setSubmitError(null);
    const parsed = formSchema.safeParse({ storeId, name, parentId, icon });
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0];
      setFieldError(msg ?? 'Geçersiz alan');
      return;
    }
    setSubmitting(true);
    const result = await createCategory({
      storeId: parsed.data.storeId,
      name: parsed.data.name,
      parentId: parsed.data.parentId ?? null,
      icon: parsed.data.icon ?? null,
    });
    setSubmitting(false);
    if (result.ok) {
      onOpenChange(false);
      onSuccess?.();
    } else {
      setSubmitError(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni kategori</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeId">Mağaza</Label>
            <Select
              value={storeId}
              onValueChange={(v) => {
                setStoreId(v);
                setParentId(null);
              }}
            >
              <SelectTrigger id="storeId">
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

          <div className="space-y-2">
            <Label htmlFor="parentId">Üst kategori</Label>
            <Select
              value={parentId ?? 'root'}
              onValueChange={(v) => setParentId(v === 'root' ? null : v)}
              disabled={loadingParents}
            >
              <SelectTrigger id="parentId">
                <SelectValue placeholder={loadingParents ? 'Yükleniyor…' : 'Ana kategori (üst yok)'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Ana kategori (üst yok)</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.path || p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Kategori adı</Label>
            <Input
              id="name"
              placeholder="Örn: Elektronik"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {fieldError && (
              <p className="text-sm text-destructive">{fieldError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>İkon</Label>
            <CategoryIconPicker value={icon} onChange={setIcon} />
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              İptal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Kaydediliyor…' : 'Kategori ekle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
