# OmniCore

**B2C, B2B, Pazaryeri, E-Fatura ve Muhasebe** çözümlerini tek çatıda toplayan enterprise e-ticaret ekosistemi.

## Mimari Özet

| Katman | Teknoloji |
|--------|-----------|
| Frontend / API | Next.js 15 (App Router), TypeScript |
| Veritabanı | PostgreSQL (multi-tenant) |
| Cache & Kuyruk | Redis, BullMQ |
| Güvenlik | Cloudflare (WAF), SSL, S3 yedekleme |

## Modüller

- **Marketplace & XML:** Trendyol, Hepsiburada, Amazon, N11, Shopify, Google Merchant, Meta Catalog, Cimri, Akakçe vb.
- **Finance:** Logo, Mikro, DİA, Paraşüt, Bizimhesap, Turkcell e-Şirket; PayTR, İyzico, Cari/Havale
- **B2B / B2C:** Dahili mağaza motoru, bayi fiyat listesi, cari hareket
- **AI:** Otomatik soru-cevap, kategori/özellik eşleştirme
- **Lojistik:** Yurtiçi, Aras, MNG, PTT kargo API
- **İletişim:** NetGSM/MasGSM SMS, SMTP e-posta pazarlama

## Gereksinimler

- **PostgreSQL** (port 5432). Örnek: `brew install postgresql@16 && brew services start postgresql@16` veya Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=omnicore postgres:16`
- **Redis** (port 6379, opsiyonel; queue kullanacaksanız gerekli). Örnek: `brew services start redis` veya `docker run -d -p 6379:6379 redis`

`.env` içinde `DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/omnicore"` şeklinde ayarlayın.

## Kurulum

```bash
# Bağımlılıklar
pnpm install

# Ortam değişkenleri (.env oluştur, sonra DATABASE_URL ve REDIS_URL düzenleyin)
cp .env.example .env

# Veritabanı (PostgreSQL çalışıyor olmalı)
pnpm db:generate
pnpm db:push
# Alternatif: migration ile: pnpm db:migrate

# Geliştirme
pnpm dev
```

- **Dashboard:** http://localhost:3000  
- **Queue worker (ayrı terminal):** `pnpm queue:dev`

### Redis (Docker)

```bash
# Tek komut
pnpm docker:redis

# veya docker-compose (tercih edilen)
docker compose up -d
```

### XML import testi

1. Redis çalışıyor olsun (`pnpm docker:redis` veya `docker compose up -d`).
2. Bir terminalde: `pnpm queue:dev`.
3. Başka bir terminalde: `pnpm dev`.
4. Test XML'ini tetikle: `pnpm run test:xml-import`.

Test XML'i `public/test-feed.xml` içinde; 3 örnek ürün vardır. İşlem xml-import kuyruğuna düşer, worker ürünleri DB'ye yazar ve her biri için marketplace-sync job'ı oluşturur.

## Proje Yapısı

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Ana dashboard (sipariş, stok, e-fatura özeti)
│   ├── stores/
│   ├── orders/
│   ├── products/
│   ├── accounting/
│   └── logistics/
├── components/
│   ├── ui/                 # Shadcn/UI (Button, Card, Progress)
│   ├── dashboard/          # Dashboard istatistik ve listeler
│   └── theme-provider.tsx   # Dark/Light mode
├── lib/
│   ├── prisma.ts
│   ├── utils.ts
│   ├── integrations/       # Adapter Pattern
│   │   ├── base/            # MarketplaceIntegrationBase, AccountingIntegrationBase
│   │   ├── adapters/        # Trendyol, Hepsiburada, Logo, Paraşüt
│   │   ├── types.ts
│   │   └── IntegrationManager.ts
│   └── queue/               # BullMQ
│       ├── connection.ts
│       ├── queues.ts
│       └── worker.ts
prisma/
└── schema.prisma            # Multi-tenant şema (Store, Product, Order, B2B, Accounting, Job, ...)
```

## Veritabanı Şeması (Özet)

- **Tenant / Store:** Multi-tenant root; her mağaza izole.
- **Product, Category, ProductImage, ProductCategory:** Katalog.
- **MarketplaceConnection, MarketplaceListing:** Pazaryeri bağlantı ve liste.
- **XmlFeed, XmlFeedItem:** Google Merchant, Meta, Cimri, Akakçe XML.
- **Order, OrderItem:** Sipariş (B2C/B2B/pazaryeri).
- **B2BCustomer, B2BPriceList, B2BPriceListProduct:** Bayi ve özel fiyat.
- **AccountingIntegration, PaymentIntegration, LogisticsSetting:** Entegrasyon ayarları.
- **Job:** Asenkron iş kuyruğu (sync, e-fatura, XML, SMS, vb.).

## Integration Manager

Pazaryeri ve muhasebe için **abstract base class** + **adapter** yapısı:

- `getMarketplaceIntegration(platform, storeId, credentials, rateLimit)` → `MarketplaceIntegrationBase`
- `getAccountingIntegration(provider, storeId, credentials, settings)` → `AccountingIntegrationBase`

Yeni platform eklemek için ilgili adapter sınıfını yazıp `IntegrationManager.ts` içindeki registry’e eklemeniz yeterli.

## Rate Limit & Job

- BullMQ kuyrukları: **product-sync** (ürün/XML toplu iş), **marketplace-sync**, **accounting**, **xml-feed**, **general**.
- Worker: `pnpm run queue:dev` → `src/lib/queue/run-workers.ts`. Ağır işler (örn. 10k ürün XML) API'yi bloke etmez; iş kuyruğa alınır, worker arka planda işler.
- API’den iş eklemek: `import { addProductSyncJob } from '@/lib/queue'; const { jobId } = await addProductSyncJob(storeId, { type: 'xml_import', xmlUrl });` — yanıt anında döner, durum Prisma `Job` tablosundan takip edilir.

## Lisans

Proje sahibine aittir.
