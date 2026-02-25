import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { matchCategory } from '@/services/ai/category-matcher';

/** POST - Ürün adı/açıklamasından mağaza veya pazaryeri kategorisi öner */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const productName = typeof body.productName === 'string' ? body.productName.trim() : '';
    const productDescription = typeof body.productDescription === 'string' ? body.productDescription.trim() : undefined;
    const storeId = typeof body.storeId === 'string' ? body.storeId : undefined;
    const platform = typeof body.platform === 'string' ? body.platform : undefined;

    if (!productName) {
      return NextResponse.json(
        { error: 'Ürün adı gerekli' },
        { status: 400 }
      );
    }

    let categories: Array<{ id: string; name: string; path?: string }> = [];

    if (storeId) {
      const storeCategories = await prisma.category.findMany({
        where: { storeId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, parentId: true },
      });
      function buildPath(id: string): string {
        const cat = storeCategories.find((c) => c.id === id);
        if (!cat?.parentId) return cat?.name ?? '';
        return `${buildPath(cat.parentId)} > ${cat.name}`;
      }
      categories = storeCategories.map((c) => ({
        id: c.id,
        name: c.name,
        path: buildPath(c.id),
      }));
    }

    if (categories.length === 0 && (platform === 'TRENDYOL' || !storeId)) {
      categories = getTrendyolSampleCategories();
    }

    if (categories.length === 0) {
      return NextResponse.json(
        { error: 'Eşleştirme için mağaza kategorisi ekleyin veya platform seçin' },
        { status: 400 }
      );
    }

    const result = await matchCategory({
      productName,
      productDescription,
      categories,
      platform: platform ?? 'TRENDYOL',
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Match category error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getTrendyolSampleCategories(): Array<{ id: string; name: string; path: string }> {
  return [
    { id: '1', name: 'Erkek Giyim', path: 'Erkek > Giyim' },
    { id: '2', name: 'Kadın Giyim', path: 'Kadın > Giyim' },
    { id: '3', name: 'Gömlek', path: 'Erkek > Giyim > Üst Giyim > Gömlek' },
    { id: '4', name: 'Tişört', path: 'Erkek > Giyim > Üst Giyim > Tişört' },
    { id: '5', name: 'Pantolon', path: 'Erkek > Giyim > Alt Giyim > Pantolon' },
    { id: '6', name: 'Çanta', path: 'Kadın > Aksesuar > Çanta' },
    { id: '7', name: 'Ayakkabı', path: 'Erkek > Ayakkabı' },
    { id: '8', name: 'Elektronik', path: 'Elektronik' },
    { id: '9', name: 'Ev & Yaşam', path: 'Ev & Yaşam' },
  ];
}
