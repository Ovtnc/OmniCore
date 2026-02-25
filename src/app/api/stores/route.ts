import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET - Mağaza listesi */
export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        currency: true,
        domain: true,
        createdAt: true,
        tenant: { select: { name: true, slug: true } },
        _count: {
          select: { products: true, marketplaceConnections: true, orders: true },
        },
      },
    });
    return NextResponse.json(stores);
  } catch (e) {
    console.error('Stores list error:', e);
    return NextResponse.json({ error: 'Mağazalar listelenemedi' }, { status: 500 });
  }
}

/** POST - Yeni mağaza oluştur */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') : '';
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId : null;
    const currency = typeof body.currency === 'string' ? body.currency : 'TRY';

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Mağaza adı ve slug gerekli' },
        { status: 400 }
      );
    }

    let finalTenantId = tenantId;
    if (!finalTenantId) {
      let first = await prisma.tenant.findFirst({ select: { id: true } });
      if (!first) {
        const tenant = await prisma.tenant.create({
          data: { name: 'Varsayılan Şirket', slug: 'default' },
          select: { id: true },
        });
        first = tenant;
      }
      finalTenantId = first.id;
    }

    const existing = await prisma.store.findUnique({
      where: { tenantId_slug: { tenantId: finalTenantId, slug } },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Bu tenant için bu slug zaten kullanılıyor' },
        { status: 409 }
      );
    }

    const store = await prisma.store.create({
      data: {
        tenantId: finalTenantId,
        name,
        slug,
        currency,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        currency: true,
        createdAt: true,
      },
    });
    return NextResponse.json(store);
  } catch (e) {
    console.error('Store create error:', e);
    return NextResponse.json({ error: 'Mağaza oluşturulamadı' }, { status: 500 });
  }
}
