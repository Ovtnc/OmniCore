'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u00C0-\u024F\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'kategori';

export type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  children: CategoryTreeNode[];
};

/**
 * Mağaza bazlı hiyerarşik kategori ağacı (parent → children).
 */
export async function getCategoriesTree(storeId: string): Promise<CategoryTreeNode[]> {
  const flat = await prisma.category.findMany({
    where: { storeId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      sortOrder: true,
      isActive: true,
      parentId: true,
      _count: { select: { products: true } },
    },
  });

  const productCounts = await Promise.all(
    flat.map((c) =>
      prisma.productCategory.count({
        where: { categoryId: c.id, product: { isActive: true } },
      })
    )
  );

  const byId = new Map(
    flat.map((c, i) => [
      c.id,
      {
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        productCount: productCounts[i] ?? c._count.products,
        children: [] as CategoryTreeNode[],
      },
    ])
  );

  const roots: CategoryTreeNode[] = [];
  for (const c of flat) {
    const node = byId.get(c.id)!;
    if (!c.parentId) {
      roots.push(node);
    } else {
      const parent = byId.get(c.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  return roots;
}

/**
 * Üst kategori seçimi için düz liste (path ile). Kendisi ve altları hariç (döngü önleme).
 */
export async function getCategoriesFlatForSelect(
  storeId: string,
  excludeCategoryId?: string
): Promise<{ id: string; name: string; path: string }[]> {
  const flat = await prisma.category.findMany({
    where: { storeId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, parentId: true },
  });

  const byId = new Map(flat.map((c) => [c.id, c]));
  const pathCache = new Map<string, string>();

  function path(id: string): string {
    if (pathCache.has(id)) return pathCache.get(id)!;
    const c = byId.get(id);
    if (!c) return '';
    const p = c.parentId ? `${path(c.parentId)} > ${c.name}` : c.name;
    pathCache.set(id, p);
    return p;
  }

  const excludeIds = new Set<string>();
  if (excludeCategoryId) {
    const add = (id: string) => {
      excludeIds.add(id);
      flat.filter((c) => c.parentId === id).forEach((c) => add(c.id));
    };
    add(excludeCategoryId);
  }

  return flat
    .filter((c) => !excludeIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, path: path(c.id) }));
}

const createSchema = z.object({
  storeId: z.string().min(1, 'Mağaza seçin'),
  name: z.string().min(1, 'Kategori adı gerekli').max(255),
  parentId: z.string().nullable(),
  icon: z.string().nullable(),
});

export type CreateCategoryResult = { ok: true; id: string } | { ok: false; error: string };

export async function createCategory(
  input: z.infer<typeof createSchema>
): Promise<CreateCategoryResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? 'Geçersiz veri' };
  }

  const { storeId, name, parentId, icon } = parsed.data;

  const existing = await prisma.category.findFirst({
    where: {
      storeId,
      parentId: parentId ?? null,
      name: { equals: name, mode: 'insensitive' },
    },
  });
  if (existing) {
    return { ok: false, error: 'Bu mağazada aynı üst kategori altında bu isimde bir kategori zaten var.' };
  }

  let baseSlug = slugify(name);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.category.findUnique({ where: { storeId_slug: { storeId, slug } } })) {
    slug = `${baseSlug}-${++n}`;
  }

  try {
    const category = await prisma.category.create({
      data: {
        storeId,
        parentId: parentId || null,
        name: name.trim(),
        slug,
        icon: icon || null,
      },
    });
    revalidatePath('/products');
    revalidatePath('/categories');
    return { ok: true, id: category.id };
  } catch (e) {
    console.error('createCategory:', e);
    return { ok: false, error: 'Kategori oluşturulurken bir hata oluştu.' };
  }
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCategoryResult = { ok: true } | { ok: false; error: string };

export async function updateCategory(
  input: z.infer<typeof updateSchema>
): Promise<UpdateCategoryResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? 'Geçersiz veri' };
  }

  const { id, name, parentId, icon, isActive } = parsed.data;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: 'Kategori bulunamadı.' };
  }

  if (parentId !== undefined && parentId === id) {
    return { ok: false, error: 'Bir kategori kendisinin alt kategorisi olamaz.' };
  }

  if (name !== undefined) {
    const duplicate = await prisma.category.findFirst({
      where: {
        storeId: existing.storeId,
        parentId: (parentId ?? existing.parentId) ?? null,
        name: { equals: name, mode: 'insensitive' },
        id: { not: id },
      },
    });
    if (duplicate) {
      return { ok: false, error: 'Bu mağazada aynı üst kategori altında bu isimde bir kategori zaten var.' };
    }
  }

  let slug: string | undefined;
  if (name !== undefined && name.trim() !== existing.name) {
    let baseSlug = slugify(name.trim());
    slug = baseSlug;
    let n = 1;
    while (
      await prisma.category.findFirst({
        where: { storeId: existing.storeId, slug, id: { not: id } },
      })
    ) {
      slug = `${baseSlug}-${++n}`;
    }
  }

  try {
    await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(slug !== undefined && { slug }),
        ...(parentId !== undefined && { parentId }),
        ...(icon !== undefined && { icon }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    revalidatePath('/products');
    revalidatePath('/categories');
    return { ok: true };
  } catch (e) {
    console.error('updateCategory:', e);
    return { ok: false, error: 'Kategori güncellenirken bir hata oluştu.' };
  }
}

export type DeleteCategoryResult =
  | { ok: true; productCount: number }
  | { ok: false; error: string };

/**
 * Kategori siler. Ürünlerden bu kategori atanmasını kaldırır (Kategorisiz).
 * moveProductsToUncategorized: true ise ürünler sadece kategoriden çıkarılır, silinmez.
 */
export async function deleteCategory(
  id: string,
  moveProductsToUncategorized: boolean = true
): Promise<DeleteCategoryResult> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!category) {
    return { ok: false, error: 'Kategori bulunamadı.' };
  }
  if (category._count.children > 0) {
    return { ok: false, error: 'Alt kategorisi olan kategori silinemez. Önce alt kategorileri kaldırın.' };
  }

  const productCount = category._count.products;

  try {
    if (moveProductsToUncategorized) {
      await prisma.productCategory.deleteMany({ where: { categoryId: id } });
    }
    await prisma.category.delete({ where: { id } });
    revalidatePath('/products');
    revalidatePath('/categories');
    return { ok: true, productCount };
  } catch (e) {
    console.error('deleteCategory:', e);
    return { ok: false, error: 'Kategori silinirken bir hata oluştu.' };
  }
}
