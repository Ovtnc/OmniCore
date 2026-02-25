import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET - İş listesi (son job'lar, isteğe bağlı storeId filtresi) */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

    const jobs = await prisma.job.findMany({
      where: storeId ? { storeId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        storeId: true,
        type: true,
        status: true,
        payload: true,
        result: true,
        error: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        store: { select: { name: true, slug: true } },
      },
    });
    return NextResponse.json(jobs);
  } catch (e) {
    console.error('Jobs list error:', e);
    return NextResponse.json({ error: 'İşler listelenemedi' }, { status: 500 });
  }
}
