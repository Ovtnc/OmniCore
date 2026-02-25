/**
 * POST - Bağlantıyı kaydetmeden test et (API anahtarları geçerli mi?)
 * Body: create ile aynı (platform, sellerId, apiKey, apiSecret, extraConfig)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { MarketplacePlatform } from '@prisma/client';
import { getMarketplaceAdapter } from '@/services/marketplaces';

function buildConnection(body: {
  platform: MarketplacePlatform;
  sellerId?: string;
  apiKey?: string;
  apiSecret?: string;
  extraConfig?: Record<string, unknown>;
}): Record<string, string | undefined> {
  const conn: Record<string, string | undefined> = {
    apiKey: body.apiKey ?? undefined,
    apiSecret: body.apiSecret ?? undefined,
    sellerId: body.sellerId ?? undefined,
    supplierId: body.sellerId ?? undefined,
  };
  if (body.extraConfig && typeof body.extraConfig === 'object') {
    for (const [k, v] of Object.entries(body.extraConfig)) {
      if (typeof v === 'string') conn[k] = v;
    }
  }
  return conn;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    await params;
    const body = await req.json().catch(() => ({}));
    const { platform, sellerId, apiKey, apiSecret, extraConfig } = body as {
      platform?: MarketplacePlatform;
      sellerId?: string;
      apiKey?: string;
      apiSecret?: string;
      extraConfig?: Record<string, unknown>;
    };

    if (!platform) {
      return NextResponse.json(
        { ok: false, error: 'platform gerekli' },
        { status: 400 }
      );
    }

    const adapter = getMarketplaceAdapter(platform);
    const connection = buildConnection({
      platform,
      sellerId,
      apiKey,
      apiSecret,
      extraConfig,
    });

    const result = await adapter.testConnection(connection);

    if (result.ok) {
      return NextResponse.json({ ok: true, message: 'Bağlantı başarıyla doğrulandı.' });
    }
    return NextResponse.json(
      { ok: false, error: result.message ?? 'Bağlantı testi başarısız' },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Marketplace connection test error:', e);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
