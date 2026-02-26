import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST - Kargo bağlantısını test et
 * Not: Bu projede henüz gerçek kargo provider API entegrasyonu yok.
 * Bu yüzden test endpointi "başarılı" dönmez; desteklenmiyorsa açıkça 501 döner.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; settingId: string }> }
) {
  try {
    const { storeId, settingId } = await params;
    const setting = await prisma.logisticsSetting.findFirst({
      where: { id: settingId, storeId },
      select: { id: true, provider: true, apiKey: true, apiSecret: true },
    });
    if (!setting) {
      return NextResponse.json({ error: 'Kargo ayarı bulunamadı' }, { status: 404 });
    }

    if (!setting.apiKey || !setting.apiSecret) {
      return NextResponse.json(
        { ok: false, error: 'API Key ve API Secret gerekli' },
        { status: 400 }
      );
    }

    // Gerçek provider adapter'ları bağlanana kadar false-positive üretme.
    return NextResponse.json({
      ok: false,
      error: `${setting.provider} için canlı bağlantı testi henüz desteklenmiyor`,
    }, { status: 501 });
  } catch (e) {
    console.error('Logistics test error:', e);
    return NextResponse.json(
      { ok: false, error: 'Test yapılamadı' },
      { status: 500 }
    );
  }
}
