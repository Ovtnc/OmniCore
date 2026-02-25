import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET - Mağaza kategorileri (ağaç yapısı, AI eşleştirme için id/name/path) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const categories = await prisma.category.findMany({
      where: { storeId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, parentId: true },
    });

    function buildPath(id: string): string {
      const cat = categories.find((c) => c.id === id);
      if (!cat) return '';
      if (!cat.parentId) return cat.name;
      return `${buildPath(cat.parentId)} > ${cat.name}`;
    }

    const withPath = categories.map((c) => ({
      id: c.id,
      name: c.name,
      path: buildPath(c.id),
    }));
    return NextResponse.json(withPath);
  } catch (e) {
    console.error('Categories list error:', e);
    return NextResponse.json({ error: 'Kategoriler listelenemedi' }, { status: 500 });
  }
}
