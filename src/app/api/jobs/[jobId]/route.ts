import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET - Tek job durumu (sihirbaz polling için) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        storeId: true,
        type: true,
        status: true,
        result: true,
        error: true,
        startedAt: true,
        finishedAt: true,
      },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job bulunamadı' }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch (e) {
    console.error('Job get error:', e);
    return NextResponse.json({ error: 'Job getirilemedi' }, { status: 500 });
  }
}
