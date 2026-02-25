import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { MarketplacePlatform } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { encryptCredentials } from '@/lib/credentials';
import { getMarketplaceAdapter } from '@/services/marketplaces';
import { toUserFriendlyConnectionError } from '@/lib/marketplace-connection-errors';

/**
 * GET - Mağazanın pazaryeri bağlantılarını listele
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const connections = await prisma.marketplaceConnection.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        platform: true,
        sellerId: true,
        isActive: true,
        lastSyncAt: true,
        rateLimitRemaining: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { listings: true } },
      },
    });
    return NextResponse.json(connections);
  } catch (e) {
    console.error('Marketplace connections list error:', e);
    return NextResponse.json(
      { error: 'Bağlantılar listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST - Yeni pazaryeri bağlantısı ekle
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await req.json();
    const { platform, sellerId, apiKey, apiSecret, extraConfig, isActive } = body as {
      platform: MarketplacePlatform;
      sellerId?: string;
      apiKey?: string;
      apiSecret?: string;
      extraConfig?: Record<string, unknown>;
      isActive?: boolean;
    };

    if (!platform) {
      return NextResponse.json(
        { error: 'platform gerekli' },
        { status: 400 }
      );
    }

    const adapter = getMarketplaceAdapter(platform);
    const connection = {
      apiKey: apiKey ?? undefined,
      apiSecret: apiSecret ?? undefined,
      sellerId: sellerId ?? undefined,
      supplierId: sellerId ?? undefined,
      ...(typeof extraConfig === 'object' && extraConfig !== null
        ? Object.fromEntries(
            Object.entries(extraConfig).filter(([, v]) => typeof v === 'string') as [string, string][]
          )
        : {}),
    };
    const testResult = await adapter.testConnection(connection);
    if (!testResult.ok) {
      const { status: errStatus, error: userMsg } = toUserFriendlyConnectionError(
        testResult.message ?? 'Bağlantı doğrulanamadı'
      );
      return NextResponse.json({ error: userMsg }, { status: errStatus });
    }

    const connectionRecord = await prisma.marketplaceConnection.create({
      data: {
        storeId,
        platform,
        sellerId: sellerId ?? null,
        apiKey: encryptCredentials(apiKey ?? undefined) ?? null,
        apiSecret: encryptCredentials(apiSecret ?? undefined) ?? null,
        extraConfig: (extraConfig ?? undefined) as Prisma.InputJsonValue | undefined,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      id: connectionRecord.id,
      platform: connectionRecord.platform,
      isActive: connectionRecord.isActive,
      createdAt: connectionRecord.createdAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Bu pazaryeri için zaten bir bağlantı var' },
        { status: 409 }
      );
    }
    console.error('Marketplace connection create error:', e);
    const { status: errStatus, error: userMsg } = toUserFriendlyConnectionError(message);
    return NextResponse.json(
      { error: userMsg },
      { status: errStatus >= 400 && errStatus < 600 ? errStatus : 500 }
    );
  }
}
