/**
 * POST - Bağlantıyı kaydetmeden test et (API anahtarları geçerli mi?)
 * Body: create ile aynı (platform, sellerId, apiKey, apiSecret, extraConfig)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { MarketplacePlatform } from '@prisma/client';
import { getMarketplaceAdapter } from '@/services/marketplaces';
import { toUserFriendlyConnectionError } from '@/lib/marketplace-connection-errors';

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
    if (!adapter.supportsLiveConnectionTest()) {
      return NextResponse.json(
        { ok: false, error: `${platform} için canlı bağlantı testi henüz desteklenmiyor` },
        { status: 501 }
      );
    }

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
    const errMsg = result.message ?? 'Bağlantı testi başarısız';
    const { status: errStatus, error: userMsg } = toUserFriendlyConnectionError(errMsg);
    return NextResponse.json({ ok: false, error: userMsg }, { status: errStatus });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Marketplace connection test error:', e);
    const { status: errStatus, error: userMsg } = toUserFriendlyConnectionError(message);
    return NextResponse.json({ ok: false, error: userMsg }, { status: errStatus });
  }
}
