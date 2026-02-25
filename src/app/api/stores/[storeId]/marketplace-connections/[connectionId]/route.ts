import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { encryptCredentials } from '@/lib/credentials';

/**
 * GET - Tek bağlantı detayı (API key/secret döndürülmez)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; connectionId: string }> }
) {
  try {
    const { storeId, connectionId } = await params;
    const connection = await prisma.marketplaceConnection.findFirst({
      where: { id: connectionId, storeId },
      select: {
        id: true,
        platform: true,
        sellerId: true,
        isActive: true,
        lastSyncAt: true,
        rateLimitRemaining: true,
        rateLimitResetAt: true,
        extraConfig: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { listings: true } },
      },
    });
    if (!connection) {
      return NextResponse.json({ error: 'Bağlantı bulunamadı' }, { status: 404 });
    }
    return NextResponse.json(connection);
  } catch (e) {
    console.error('Marketplace connection get error:', e);
    return NextResponse.json({ error: 'Bağlantı alınamadı' }, { status: 500 });
  }
}

/**
 * PATCH - Bağlantı güncelle (apiKey/apiSecret opsiyonel; gönderilirse güncellenir)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; connectionId: string }> }
) {
  try {
    const { storeId, connectionId } = await params;
    const body = await req.json();
    const { sellerId, apiKey, apiSecret, extraConfig, isActive } = body as {
      sellerId?: string;
      apiKey?: string;
      apiSecret?: string;
      extraConfig?: Record<string, unknown>;
      isActive?: boolean;
    };

    const existing = await prisma.marketplaceConnection.findFirst({
      where: { id: connectionId, storeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Bağlantı bulunamadı' }, { status: 404 });
    }

    const data: Prisma.MarketplaceConnectionUpdateInput = {};
    if (sellerId !== undefined) data.sellerId = sellerId || null;
    if (apiKey !== undefined) data.apiKey = encryptCredentials(apiKey ?? undefined) ?? null;
    if (apiSecret !== undefined) data.apiSecret = encryptCredentials(apiSecret ?? undefined) ?? null;
    if (extraConfig !== undefined) data.extraConfig = (extraConfig ?? undefined) as Prisma.InputJsonValue;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const connection = await prisma.marketplaceConnection.update({
      where: { id: connectionId },
      data,
    });

    return NextResponse.json({
      id: connection.id,
      platform: connection.platform,
      isActive: connection.isActive,
      updatedAt: connection.updatedAt,
    });
  } catch (e) {
    console.error('Marketplace connection update error:', e);
    return NextResponse.json({ error: 'Bağlantı güncellenemedi' }, { status: 500 });
  }
}

/**
 * DELETE - Bağlantıyı kaldır
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; connectionId: string }> }
) {
  try {
    const { storeId, connectionId } = await params;
    const existing = await prisma.marketplaceConnection.findFirst({
      where: { id: connectionId, storeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Bağlantı bulunamadı' }, { status: 404 });
    }
    await prisma.marketplaceConnection.delete({ where: { id: connectionId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Marketplace connection delete error:', e);
    return NextResponse.json({ error: 'Bağlantı silinemedi' }, { status: 500 });
  }
}
