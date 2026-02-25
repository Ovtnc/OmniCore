import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { MarketplacePlatform } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { encryptCredentials } from '@/lib/credentials';

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

    const connection = await prisma.marketplaceConnection.create({
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
      id: connection.id,
      platform: connection.platform,
      isActive: connection.isActive,
      createdAt: connection.createdAt,
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
    return NextResponse.json(
      { error: 'Bağlantı eklenemedi' },
      { status: 500 }
    );
  }
}
