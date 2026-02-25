'use client';

import { useState, useEffect } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ChevronRight, Folder, FolderOpen, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { CategoryIcon, CategoryIconPicker } from './category-icon-picker';
import { AddCategoryForm } from './AddCategoryForm';
import {
  getCategoriesTree,
  getCategoriesFlatForSelect,
  deleteCategory,
  type CategoryTreeNode,
} from '@/app/actions/categories';

type StoreOption = { id: string; name: string; slug: string };

type Props = {
  stores: StoreOption[];
  storeId: string;
  onStoreChange?: (storeId: string) => void;
};

function TreeNode({
  node,
  depth,
  onRefresh,
  onEdit,
  stores,
}: {
  node: CategoryTreeNode;
  depth: number;
  onRefresh: () => void;
  onEdit: (id: string) => void;
  stores: StoreOption[];
}) {
  const [open, setOpen] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasChildren = node.children.length > 0;

  const handleDelete = async (moveToUncategorized: boolean) => {
    setDeleting(true);
    const result = await deleteCategory(node.id, moveToUncategorized);
    setDeleting(false);
    setDeleteDialog(false);
    if (result.ok) onRefresh();
  };

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className="group flex items-center gap-2 rounded-md py-1.5 pr-2 transition-colors hover:bg-muted/60"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          {hasChildren ? (
            open ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-amber-500/90" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-amber-500/90" />
            )
          ) : (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              <CategoryIcon iconName={node.icon} />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate font-medium">{node.name}</span>
          {node.productCount > 0 && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {node.productCount}
            </Badge>
          )}
          {!node.isActive && (
            <Badge variant="outline" className="shrink-0 text-xs">
              Pasif
            </Badge>
          )}
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(node.id)}
              title="Düzenle"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setDeleteDialog(true)}
              title="Sil"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <CollapsibleContent>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onRefresh={onRefresh}
              onEdit={onEdit}
              stores={stores}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kategoriyi sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &quot;{node.name}&quot; kategorisini siliyorsunuz. Bu kategorideki ürünler
            kategorisiz (atamasız) kalacak. Devam etmek istiyor musunuz?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(false)}
              disabled={deleting}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(true)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sil (ürünler kategorisiz)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CategoryManager({ stores, storeId, onStoreChange }: Props) {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const refresh = () => {
    if (!storeId) {
      setTree([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getCategoriesTree(storeId)
      .then(setTree)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, [storeId]);

  const currentStore = stores.find((s) => s.id === storeId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {stores.length > 1 && (
            <select
              value={storeId}
              onChange={(e) => onStoreChange?.(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Mağaza seçin</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          {currentStore && (
            <span className="text-sm text-muted-foreground">
              {currentStore.name} – Kategoriler
            </span>
          )}
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Yeni kategori
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !storeId ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
          <p className="text-sm text-muted-foreground">Kategori listesi için mağaza seçin.</p>
        </div>
      ) : tree.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20">
          <p className="text-sm text-muted-foreground">Henüz kategori yok.</p>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            İlk kategoriyi ekle
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              onRefresh={refresh}
              onEdit={setEditId}
              stores={stores}
            />
          ))}
        </div>
      )}

      <AddCategoryForm
        open={addOpen}
        onOpenChange={setAddOpen}
        stores={stores}
        defaultStoreId={storeId || undefined}
        onSuccess={refresh}
      />

      {editId && (
        <EditCategoryDialog
          categoryId={editId}
          storeId={storeId}
          open={!!editId}
          onOpenChange={(open) => !open && setEditId(null)}
          onSuccess={() => {
            setEditId(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function EditCategoryDialog({
  categoryId,
  storeId,
  open,
  onOpenChange,
  onSuccess,
}: {
  categoryId: string;
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<{
    id: string;
    name: string;
    parentId: string | null;
    icon: string | null;
    isActive: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !categoryId) return;
    setLoading(true);
    fetch(`/api/categories/${categoryId}`)
      .then((r) => r.json())
      .then((d) => {
        setCategory(d);
      })
      .catch(() => setCategory(null))
      .finally(() => setLoading(false));
  }, [open, categoryId]);

  if (!category && !loading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kategori düzenle</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : category ? (
          <EditCategoryFormInner
            category={category}
            storeId={storeId}
            onCancel={() => onOpenChange(false)}
            onSuccess={onSuccess}
            saving={saving}
            setSaving={setSaving}
            error={error}
            setError={setError}
          />
        ) : (
          <p className="text-sm text-destructive">Kategori yüklenemedi.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditCategoryFormInner({
  category,
  storeId,
  onCancel,
  onSuccess,
  saving,
  setSaving,
  error,
  setError,
}: {
  category: { id: string; name: string; parentId: string | null; icon: string | null; isActive: boolean };
  storeId: string;
  onCancel: () => void;
  onSuccess: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
}) {
  const [name, setName] = useState(category.name);
  const [parentId, setParentId] = useState<string | null>(category.parentId);
  const [icon, setIcon] = useState<string | null>(category.icon);
  const [isActive, setIsActive] = useState(category.isActive);
  const [parentOptions, setParentOptions] = useState<{ id: string; name: string; path: string }[]>([]);

  useEffect(() => {
    getCategoriesFlatForSelect(storeId, category.id).then(setParentOptions);
  }, [storeId, category.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { updateCategory } = await import('@/app/actions/categories');
    const result = await updateCategory({
      id: category.id,
      name: name.trim(),
      parentId,
      icon,
      isActive,
    });
    setSaving(false);
    if (result.ok) {
      onSuccess();
    } else {
      setError(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Kategori adı</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Üst kategori</label>
        <select
          value={parentId ?? 'root'}
          onChange={(e) => setParentId(e.target.value === 'root' ? null : e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="root">Ana kategori (üst yok)</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.path || p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">İkon</label>
        <CategoryIconPicker value={icon} onChange={setIcon} />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <label htmlFor="isActive" className="text-sm">Aktif</label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          İptal
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </DialogFooter>
    </form>
  );
}