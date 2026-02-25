/**
 * Test siparişleri oluşturur.
 * Mağaza veya ürün yoksa önce onları oluşturur.
 * Kullanım: pnpm exec tsx scripts/seed-orders.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLATFORMS = [
  'TRENDYOL',
  'HEPSIBURADA',
  'AMAZON',
  'N11',
  'SHOPIFY',
  'PAZARAMA',
] as const;

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

const CUSTOMERS = [
  { name: 'Ayşe Yılmaz', email: 'ayse@example.com', phone: '532 111 2233' },
  { name: 'Mehmet Demir', email: 'mehmet@example.com', phone: '533 222 3344' },
  { name: 'Zeynep Kaya', email: 'zeynep@example.com', phone: '534 333 4455' },
  { name: 'Can Özkan', email: 'can@example.com', phone: '535 444 5566' },
  { name: 'Elif Arslan', email: 'elif@example.com', phone: '536 555 6677' },
];

const SHIPPING_ADDRESS = {
  addressLine1: 'Atatürk Cad. No: 42/5',
  district: 'Kadıköy',
  city: 'İstanbul',
  postalCode: '34710',
  country: 'TR',
};

async function ensureStore() {
  let store = await prisma.store.findFirst();
  if (store) return store;

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    create: { name: 'Demo Tenant', slug: 'demo-tenant' },
    update: {},
  });

  store = await prisma.store.create({
    data: {
      tenantId: tenant.id,
      name: 'Demo Mağaza',
      slug: 'demo-magaza',
      currency: 'TRY',
    },
  });
  console.log('Oluşturuldu: mağaza', store.name);
  return store;
}

async function ensureProducts(storeId: string) {
  let products = await prisma.product.findMany({
    where: { storeId },
    take: 5,
  });
  if (products.length >= 2) return products;

  const toCreate = [
    { sku: 'DEMO-001', name: 'Örnek Ürün 1', listPrice: 199.99, salePrice: 149.99 },
    { sku: 'DEMO-002', name: 'Örnek Ürün 2', listPrice: 299.5, salePrice: 249.5 },
    { sku: 'DEMO-003', name: 'Örnek Ürün 3', listPrice: 89.9, salePrice: 69.9 },
  ];

  for (const p of toCreate) {
    const slug = p.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const created = await prisma.product.create({
      data: {
        storeId,
        sku: p.sku,
        name: p.name,
        slug,
        listPrice: p.listPrice,
        salePrice: p.salePrice,
        taxRate: 18,
        stockQuantity: 100,
      },
    });
    products.push(created);
  }
  console.log('Oluşturuldu:', products.length, 'ürün');
  return products;
}

async function main() {
  const store = await ensureStore();
  const products = await ensureProducts(store.id);
  if (products.length === 0) throw new Error('En az bir ürün gerekli');

  const existingOrders = await prisma.order.count({ where: { storeId: store.id } });
  const orderNumberStart = existingOrders + 1;
  const count = 10;

  for (let i = 0; i < count; i++) {
    const orderNum = `ORD-2025-${String(orderNumberStart + i).padStart(4, '0')}`;
    const platform = PLATFORMS[i % PLATFORMS.length];
    const status = STATUSES[i % STATUSES.length];
    const customer = CUSTOMERS[i % CUSTOMERS.length];

    const itemCount = 1 + (i % 2);
    const selectedProducts = products.slice(0, Math.min(itemCount, products.length));
    let subtotal = 0;
    const itemsData = selectedProducts.map((p, idx) => {
      const qty = 1 + (idx % 2);
      const unitPrice = Number(p.salePrice);
      const total = unitPrice * qty;
      subtotal += total;
      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        quantity: qty,
        unitPrice,
        taxRate: 18,
        taxAmount: total * 0.18,
        total,
      };
    });
    const taxTotal = subtotal * 0.18;
    const shippingCost = 29.99;
    const total = subtotal + taxTotal + shippingCost;

    await prisma.order.create({
      data: {
        storeId: store.id,
        orderNumber: orderNum,
        platform,
        channel: 'B2C',
        status,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        shippingAddress: SHIPPING_ADDRESS,
        billingAddress: SHIPPING_ADDRESS,
        subtotal,
        taxTotal,
        shippingCost,
        total,
        currency: 'TRY',
        paymentStatus: status === 'CANCELLED' ? 'PENDING' : 'PAID',
        ...(status === 'SHIPPED' || status === 'DELIVERED'
          ? { cargoProvider: 'Yurtiçi Kargo', cargoTrackingNumber: `YK${1000000 + i}` }
          : {}),
        items: {
          create: itemsData,
        },
      },
    });
    console.log('Sipariş oluşturuldu:', orderNum, platform, status);
  }

  console.log('\nToplam', count, 'test siparişi eklendi.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
