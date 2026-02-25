import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** PATCH - Öneriyi onayla veya reddet */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body.status as string | undefined;
    const approvedCategoryId = typeof body.approvedCategoryId === 'string' ? body.approvedCategoryId : undefined;

    if (!['APPROVED', 'REJECTED'].includes(status ?? '')) {
      return NextResponse.json(
        { error: 'status: APPROVED veya REJECTED olmalı' },
        { status: 400 }
      );
    }

    const suggestion = await prisma.categoryMatchSuggestion.update({
      where: { id },
      data: {
        status: status as 'APPROVED' | 'REJECTED',
        approvedCategoryId: status === 'APPROVED' ? approvedCategoryId : null,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json(suggestion);
  } catch (e) {
    console.error('Category suggestion update error:', e);
    return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 });
  }
}
