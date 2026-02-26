import { NextRequest, NextResponse } from 'next/server';
import { ListingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const daysParam = searchParams.get('days');
    const days = daysParam != null ? Math.min(parseInt(daysParam, 10), 365) : null;
    const since = days != null && Number.isFinite(days)
      ? new Date(Date.now() - Math.max(0, days) * 24 * 60 * 60 * 1000)
      : null;

    const connections = await prisma.marketplaceConnection.findMany({
      where: { storeId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        platform: true,
        isActive: true,
      },
    });

    if (connections.length === 0) {
      return NextResponse.json({
        items: [],
        connections: [],
        total: 0,
      });
    }

    const connectionIds = connections.map((c) => c.id);
    const fullySyncedClause = {
      AND: connectionIds.map((connectionId) => ({
        marketplaceListings: {
          some: { connectionId, status: ListingStatus.ACTIVE },
        },
      })),
    };
    const products = await prisma.product.findMany({
      where: {
        storeId,
        ...(since ? { updatedAt: { gte: since } } : {}),
        NOT: fullySyncedClause,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        sku: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        stockQuantity: true,
        salePrice: true,
        listPrice: true,
        marketplaceListings: {
          where: { connectionId: { in: connectionIds } },
          select: {
            connectionId: true,
            status: true,
            lastSyncAt: true,
            syncError: true,
          },
        },
      },
    });

    const items = products.map((p) => {
      const byConnection = Object.fromEntries(
        p.marketplaceListings.map((l) => [l.connectionId, l])
      );
      const unsyncedConnections = connections
        .map((c) => ({
          connectionId: c.id,
          platform: c.platform,
          status: (byConnection[c.id]?.status ?? 'PENDING') as ListingStatus | 'PENDING',
          lastSyncAt: byConnection[c.id]?.lastSyncAt ?? null,
          syncError: byConnection[c.id]?.syncError ?? null,
        }));

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        stockQuantity: p.stockQuantity,
        salePrice: p.salePrice,
        listPrice: p.listPrice,
        unsyncedConnections,
      };
    });

    return NextResponse.json({
      items,
      connections,
      total: items.length,
    });
  } catch (e) {
    console.error('Sync candidates error:', e);
    return NextResponse.json({ error: 'Senkron adayları alınamadı' }, { status: 500 });
  }
}
