/**
 * Mağaza altında kategori adına göre kategori bulur veya oluşturur (root kategori).
 * XML'den gelen "Elektronik" veya "Elektronik > Telefon" gibi tek metin kullanılır.
 */
import { prisma } from '@/lib/prisma';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u00C0-\u024F\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'kategori';
}

/**
 * @param externalId - Pazaryeri kategori ID (örn. Trendyol); oluşturulan/güncellenen kategoriye yazılır.
 */
export async function resolveOrCreateCategory(
  storeId: string,
  categoryName: string,
  parentId: string | null = null,
  externalId: string | null = null
): Promise<string | null> {
  const name = categoryName.trim();
  if (!name) return null;

  const existing = await prisma.category.findFirst({
    where: {
      storeId,
      parentId,
      name: { equals: name, mode: 'insensitive' },
    },
  });
  if (existing) {
    if (externalId != null && existing.externalId !== externalId) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { externalId },
      });
    }
    return existing.id;
  }

  let baseSlug = slugify(name);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.category.findUnique({ where: { storeId_slug: { storeId, slug } } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const category = await prisma.category.create({
    data: {
      storeId,
      parentId,
      name,
      slug,
      ...(externalId != null ? { externalId } : {}),
    },
  });
  return category.id;
}

/**
 * Ürünü verilen kategori ID'sine bağlar (önceden başka kategori varsa primary değişir veya ek bağ olur).
 */
export async function setProductCategory(
  productId: string,
  categoryId: string,
  isPrimary: boolean = true
): Promise<void> {
  if (isPrimary) {
    await prisma.productCategory.updateMany({
      where: { productId },
      data: { isPrimary: false },
    });
  }
  await prisma.productCategory.upsert({
    where: {
      productId_categoryId: { productId, categoryId },
    },
    create: { productId, categoryId, isPrimary },
    update: { isPrimary },
  });
}
