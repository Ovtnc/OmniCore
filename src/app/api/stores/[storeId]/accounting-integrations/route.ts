import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { AccountingProvider } from '@prisma/client';
import { Prisma } from '@prisma/client';

/** GET - Mağazanın muhasebe entegrasyonlarını listele */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const list = await prisma.accountingIntegration.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        name: true,
        isActive: true,
        lastSyncAt: true,
        syncError: true,
        createdAt: true,
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('Accounting integrations list error:', e);
    return NextResponse.json(
      { error: 'Muhasebe entegrasyonları listelenemedi' },
      { status: 500 }
    );
  }
}

/** POST - Yeni muhasebe entegrasyonu ekle */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await req.json().catch(() => ({}));
    const { provider, name, credentials, settings, isActive } = body as {
      provider: AccountingProvider;
      name?: string;
      credentials?: Record<string, unknown>;
      settings?: Record<string, unknown>;
      isActive?: boolean;
    };

    if (!provider) {
      return NextResponse.json(
        { error: 'provider gerekli (LOGO, MIKRO, DIA, PARASUT, BIZIMHESAP, TURKCELL_ESIRKET, LINK, ETA, OTHER)' },
        { status: 400 }
      );
    }

    const validProviders: AccountingProvider[] = [
      'LOGO', 'MIKRO', 'DIA', 'PARASUT', 'BIZIMHESAP',
      'TURKCELL_ESIRKET', 'LINK', 'ETA', 'OTHER',
    ];
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: 'Geçersiz provider' }, { status: 400 });
    }

    const integration = await prisma.accountingIntegration.create({
      data: {
        storeId,
        provider,
        name: typeof name === 'string' && name.trim() ? name.trim() : provider,
        credentials: (credentials ?? undefined) as Prisma.InputJsonValue | undefined,
        settings: (settings ?? undefined) as Prisma.InputJsonValue | undefined,
        isActive: isActive ?? true,
      },
      select: {
        id: true,
        provider: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json(integration);
  } catch (e) {
    console.error('Accounting integration create error:', e);
    return NextResponse.json(
      { error: 'Muhasebe entegrasyonu eklenemedi' },
      { status: 500 }
    );
  }
}
