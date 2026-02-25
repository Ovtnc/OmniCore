import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getConnectionWithDecryptedCredentials, toAdapterConnection } from '@/lib/marketplace-connection';
import { getMarketplaceAdapter } from '@/services/marketplaces';

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
        if (!conn.sellerId || !conn.id) {
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
          const decrypted = await getConnectionWithDecryptedCredentials(conn.id);
          if (!decrypted?.apiKey || !decrypted?.apiSecret) {
            return {
              id: conn.id,
              storeId: conn.storeId,
              storeName: conn.store.name,
              platform: conn.platform,
              ok: false,
              error: 'API anahtarı veya secret eksik',
            };
          }
          const connection = toAdapterConnection(decrypted);
          const adapter = getMarketplaceAdapter(conn.platform);
          const result = await adapter.testConnection(connection);
          return {
            id: conn.id,
            storeId: conn.storeId,
            storeName: conn.store.name,
            platform: conn.platform,
            ok: result.ok,
            error: result.ok ? null : (result.message ?? 'Bağlantı testi başarısız'),
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
