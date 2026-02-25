import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { CargoProvider } from '@prisma/client';

/** GET - Mağazanın kargo/lojistik ayarlarını listele */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const list = await prisma.logisticsSetting.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        isActive: true,
        defaultWeight: true,
        createdAt: true,
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('Logistics settings list error:', e);
    return NextResponse.json(
      { error: 'Kargo ayarları listelenemedi' },
      { status: 500 }
    );
  }
}

/** POST - Yeni kargo ayarı ekle */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await req.json().catch(() => ({}));
    const { provider, apiKey, apiSecret, defaultWeight, isActive } = body as {
      provider: CargoProvider;
      apiKey?: string;
      apiSecret?: string;
      defaultWeight?: number | null;
      isActive?: boolean;
    };

    if (!provider) {
      return NextResponse.json(
        { error: 'provider gerekli (YURTICI, ARAS, MNG, PTT, SURAT, HOROZ, OTHER)' },
        { status: 400 }
      );
    }

    const validProviders: CargoProvider[] = [
      'YURTICI', 'ARAS', 'MNG', 'PTT', 'SURAT', 'HOROZ', 'OTHER',
    ];
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: 'Geçersiz kargo provider' }, { status: 400 });
    }

    const setting = await prisma.logisticsSetting.create({
      data: {
        storeId,
        provider,
        apiKey: apiKey ?? null,
        apiSecret: apiSecret ?? null,
        defaultWeight: defaultWeight != null ? defaultWeight : null,
        isActive: isActive ?? true,
      },
      select: {
        id: true,
        provider: true,
        isActive: true,
        defaultWeight: true,
        createdAt: true,
      },
    });
    return NextResponse.json(setting);
  } catch (e) {
    console.error('Logistics setting create error:', e);
    return NextResponse.json(
      { error: 'Kargo ayarı eklenemedi' },
      { status: 500 }
    );
  }
}
