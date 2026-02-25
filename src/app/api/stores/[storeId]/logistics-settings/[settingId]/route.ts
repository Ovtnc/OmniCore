import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** PATCH - Kargo ayarı güncelle */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; settingId: string }> }
) {
  try {
    const { storeId, settingId } = await params;
    const body = await req.json().catch(() => ({}));
    const { apiKey, apiSecret, defaultWeight, isActive } = body as {
      apiKey?: string | null;
      apiSecret?: string | null;
      defaultWeight?: number | string | null;
      isActive?: boolean;
    };

    const updateData: Record<string, unknown> = {};
    if (apiKey !== undefined) updateData.apiKey = apiKey === '' ? null : apiKey;
    if (apiSecret !== undefined) updateData.apiSecret = apiSecret === '' ? null : apiSecret;
    if (defaultWeight !== undefined) {
      const w = defaultWeight === '' || defaultWeight === null ? null : Number(defaultWeight);
      updateData.defaultWeight = Number.isFinite(w) ? w : null;
    }
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const result = await prisma.logisticsSetting.updateMany({
      where: { id: settingId, storeId },
      data: updateData,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Kargo ayarı bulunamadı' }, { status: 404 });
    }
    const updated = await prisma.logisticsSetting.findUnique({
      where: { id: settingId },
      select: { id: true, provider: true, isActive: true, defaultWeight: true, updatedAt: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Logistics setting patch error:', e);
    return NextResponse.json(
      { error: 'Kargo ayarı güncellenemedi' },
      { status: 500 }
    );
  }
}

/** DELETE - Kargo ayarı sil */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; settingId: string }> }
) {
  try {
    const { storeId, settingId } = await params;
    const result = await prisma.logisticsSetting.deleteMany({
      where: { id: settingId, storeId },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Kargo ayarı bulunamadı' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Logistics setting delete error:', e);
    return NextResponse.json(
      { error: 'Kargo ayarı silinemedi' },
      { status: 500 }
    );
  }
}
