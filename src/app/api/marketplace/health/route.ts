import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMarketplaceIntegration } from '@/lib/integrations/IntegrationManager';
import type { MarketplacePlatform } from '@prisma/client';

/** GET - Tüm mağazaların pazaryeri bağlantı sağlık durumu */
export async function GET() {
  try {
    const connections = await prisma.marketplaceConnection.findMany({
      where: { isActive: true },
      select: {
        id: true,
        storeId: true,
        platform: true,
        sellerId: true,
        store: { select: { name: true } },
      },
    });

    const results = await Promise.all(
      connections.map(async (conn) => {
        const hasCreds = conn.sellerId && conn.id;
        if (!hasCreds) {
          return {
            id: conn.id,
            storeId: conn.storeId,
            storeName: conn.store.name,
            platform: conn.platform,
            ok: false,
            error: 'API anahtarı veya satıcı ID eksik',
          };
        }
        try {
          const creds = await getCredentials(conn.id);
          const integration = getMarketplaceIntegration(
            conn.platform as MarketplacePlatform,
            conn.storeId,
            creds
          );
          const ok = await integration.healthCheck();
          return {
            id: conn.id,
            storeId: conn.storeId,
            storeName: conn.store.name,
            platform: conn.platform,
            ok,
            error: ok ? null : 'Bağlantı testi başarısız',
          };
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return {
            id: conn.id,
            storeId: conn.storeId,
            storeName: conn.store.name,
            platform: conn.platform,
            ok: false,
            error: message,
          };
        }
      })
    );

    return NextResponse.json(results);
  } catch (e) {
    console.error('Marketplace health error:', e);
    return NextResponse.json({ error: 'Sağlık kontrolü yapılamadı' }, { status: 500 });
  }
}

async function getCredentials(connectionId: string) {
  const c = await prisma.marketplaceConnection.findUnique({
    where: { id: connectionId },
    select: { apiKey: true, apiSecret: true, sellerId: true },
  });
  return {
    apiKey: c?.apiKey ?? '',
    apiSecret: c?.apiSecret ?? '',
    supplierId: c?.sellerId ?? '',
  };
}
