import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { answerCustomerQuestion } from '@/services/ai/answer-question';

/** POST - Müşteri sorusuna ürün bilgisine dayalı AI cevabı üret (isteğe bağlı kayıt) */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const storeId = typeof body.storeId === 'string' ? body.storeId : undefined;
    const productId = typeof body.productId === 'string' ? body.productId : undefined;
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const platform = typeof body.platform === 'string' ? body.platform : 'MANUAL';
    const save = body.save === true;
    const existingAnswer = typeof body.answer === 'string' ? body.answer.trim() : undefined;

    if (!question) {
      return NextResponse.json({ error: 'Soru metni gerekli' }, { status: 400 });
    }

    let productName: string | undefined;
    let productDescription: string | undefined;
    let productAttributes: Record<string, string> | undefined;

    if (productId && storeId) {
      const product = await prisma.product.findFirst({
        where: { id: productId, storeId },
        select: { name: true, description: true, attributes: true },
      });
      if (product) {
        productName = product.name;
        productDescription = product.description ?? undefined;
        productAttributes =
          product.attributes && typeof product.attributes === 'object'
            ? (product.attributes as Record<string, string>)
            : undefined;
      }
    }

    const result = existingAnswer
      ? { answer: existingAnswer }
      : await answerCustomerQuestion({
          question,
          productName,
          productDescription,
          productAttributes,
          platform,
        });

    if (save && storeId) {
      const created = await prisma.customerQuestion.create({
        data: {
          storeId,
          platform,
          productId: productId ?? undefined,
          questionText: question,
          answerText: result.answer,
          status: 'ANSWERED',
          source: 'MANUAL',
          answeredAt: new Date(),
        },
      });
      return NextResponse.json({ ...result, id: created.id });
    }

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Answer question error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
