import { NextResponse } from 'next/server';
import { xmlImportQueue, marketplaceSyncQueue } from '@/lib/queue';

/** GET - Kuyruk istatistikleri (bekleyen, aktif, tamamlanan iş sayıları) */
export async function GET() {
  try {
    const [xmlImport, marketplaceSync] = await Promise.all([
      xmlImportQueue.getJobCounts(),
      marketplaceSyncQueue.getJobCounts(),
    ]);
    return NextResponse.json({
      xmlImport: {
        waiting: xmlImport.waiting ?? 0,
        active: xmlImport.active ?? 0,
        completed: xmlImport.completed ?? 0,
        failed: xmlImport.failed ?? 0,
      },
      marketplaceSync: {
        waiting: marketplaceSync.waiting ?? 0,
        active: marketplaceSync.active ?? 0,
        completed: marketplaceSync.completed ?? 0,
        failed: marketplaceSync.failed ?? 0,
      },
    });
  } catch (e) {
    console.error('Queue stats error:', e);
    return NextResponse.json(
      {
        xmlImport: { waiting: 0, active: 0, completed: 0, failed: 0 },
        marketplaceSync: { waiting: 0, active: 0, completed: 0, failed: 0 },
      },
      { status: 200 }
    );
  }
}
