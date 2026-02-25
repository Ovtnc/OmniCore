import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { QuestionStatus } from '@prisma/client';

/** GET - Mağazanın müşteri soruları (onay bekleyenler veya tümü). Veri izolasyonu: sadece storeId filtresi. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as QuestionStatus | null;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 100);

    const where: { storeId: string; status?: QuestionStatus } = { storeId };
    if (status) where.status = status;

    const questions = await prisma.customerQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        platform: true,
        productId: true,
        questionText: true,
        answerText: true,
        status: true,
        createdAt: true,
        answeredAt: true,
      },
    });
    return NextResponse.json(questions);
  } catch (e) {
    console.error('Questions list error:', e);
    return NextResponse.json({ error: 'Sorular listelenemedi' }, { status: 500 });
  }
}
