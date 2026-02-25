import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
/** PATCH - Muhasebe entegrasyonu güncelle */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; integrationId: string }> }
) {
  try {
    const { storeId, integrationId } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, credentials, settings, isActive } = body as {
      name?: string;
      credentials?: Record<string, unknown>;
      settings?: Record<string, unknown>;
      isActive?: boolean;
    };

    const updateData: Record<string, unknown> = {};
    if (typeof name === 'string') updateData.name = name.trim() || undefined;
    if (credentials !== undefined) updateData.credentials = credentials;
    if (settings !== undefined) updateData.settings = settings;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const integration = await prisma.accountingIntegration.updateMany({
      where: { id: integrationId, storeId },
      data: updateData,
    });
    if (integration.count === 0) {
      return NextResponse.json({ error: 'Entegrasyon bulunamadı' }, { status: 404 });
    }
    const updated = await prisma.accountingIntegration.findUnique({
      where: { id: integrationId },
      select: { id: true, provider: true, name: true, isActive: true, updatedAt: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Accounting integration patch error:', e);
    return NextResponse.json(
      { error: 'Muhasebe entegrasyonu güncellenemedi' },
      { status: 500 }
    );
  }
}

/** DELETE - Muhasebe entegrasyonu sil */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; integrationId: string }> }
) {
  try {
    const { storeId, integrationId } = await params;
    const result = await prisma.accountingIntegration.deleteMany({
      where: { id: integrationId, storeId },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Entegrasyon bulunamadı' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Accounting integration delete error:', e);
    return NextResponse.json(
      { error: 'Muhasebe entegrasyonu silinemedi' },
      { status: 500 }
    );
  }
}
