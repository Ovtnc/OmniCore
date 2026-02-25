import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { CategoryMatchStatus } from '@prisma/client';

/** GET - Onay bekleyen (düşük güven skorlu) AI kategori eşleştirmeleri */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const status = (searchParams.get('status') ?? 'PENDING') as CategoryMatchStatus;
    const maxConfidence = searchParams.get('maxConfidence'); // 0.0-1.0, örn. 0.85 = %85 altı

    const where: { storeId?: string; status?: CategoryMatchStatus; confidence?: { lte?: number } } = {};
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;
    if (maxConfidence != null) {
      const n = parseFloat(maxConfidence);
      if (Number.isFinite(n)) where.confidence = { lte: n };
    }

    const list = await prisma.categoryMatchSuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { store: { select: { name: true } } },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('Category suggestions list error:', e);
    return NextResponse.json({ error: 'Liste alınamadı' }, { status: 500 });
  }
}

/** POST - Yeni öneri ekle (AI eşleştirme düşük güvende kaydedildiğinde) */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const storeId = typeof body.storeId === 'string' ? body.storeId : undefined;
    const productName = typeof body.productName === 'string' ? body.productName.trim() : '';
    const productDescription = typeof body.productDescription === 'string' ? body.productDescription.trim() : undefined;
    const platform = typeof body.platform === 'string' ? body.platform : 'TRENDYOL';
    const suggestedCategoryId = typeof body.suggestedCategoryId === 'string' ? body.suggestedCategoryId : '';
    const suggestedCategoryName = typeof body.suggestedCategoryName === 'string' ? body.suggestedCategoryName : undefined;
    const confidence = typeof body.confidence === 'number' ? body.confidence : parseFloat(String(body.confidence ?? 0));

    if (!storeId || !productName || !suggestedCategoryId) {
      return NextResponse.json(
        { error: 'storeId, productName ve suggestedCategoryId gerekli' },
        { status: 400 }
      );
    }

    const suggestion = await prisma.categoryMatchSuggestion.create({
      data: {
        storeId,
        productName,
        productDescription,
        platform,
        suggestedCategoryId,
        suggestedCategoryName,
        confidence,
      },
    });
    return NextResponse.json(suggestion);
  } catch (e) {
    console.error('Category suggestion create error:', e);
    return NextResponse.json({ error: 'Kayıt oluşturulamadı' }, { status: 500 });
  }
}
