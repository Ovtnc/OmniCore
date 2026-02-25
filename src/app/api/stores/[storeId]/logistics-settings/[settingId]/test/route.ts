import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** POST - Kargo bağlantısını test et (stub: gerçek API çağrısı yapılmaz) */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; settingId: string }> }
) {
  try {
    const { storeId, settingId } = await params;
    const setting = await prisma.logisticsSetting.findFirst({
      where: { id: settingId, storeId },
      select: { id: true, provider: true },
    });
    if (!setting) {
      return NextResponse.json({ error: 'Kargo ayarı bulunamadı' }, { status: 404 });
    }
    // Stub: Yurtiçi, Aras, MNG, PTT API çağrısı ileride eklenecek
    return NextResponse.json({
      ok: true,
      message: `${setting.provider} ayarı bulundu. Gerçek API testi ileride eklenecek.`,
    });
  } catch (e) {
    console.error('Logistics test error:', e);
    return NextResponse.json(
      { ok: false, error: 'Test yapılamadı' },
      { status: 500 }
    );
  }
}
