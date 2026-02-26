# OmniCore Teknik Refactor Özeti

Bu doküman, Build & Adapter, merkezi tipler, sipariş/ürün akışları, güvenlik ve CI/CD ile ilgili yapılan değişiklikleri özetler.

---

## 1. Build & Adapter Mimarisi

- **IntegrationManager:** Zaten `@/services/marketplaces/factory` (getMarketplaceAdapter) üzerinden çalışıyordu; ek manuel enum kaldırılmadı (yoktu). Tüm pazaryeri erişimi factory üzerinden.
- **Factory dinamik registry:** `src/services/marketplaces/factory.ts` artık Prisma `MarketplacePlatform` enum değerlerini kullanıyor. Enum’a yeni eklenen platformlar (ör. PAZARAMA, IDEFIX) için otomatik olarak `StubMarketplaceAdapter` atanıyor; bilinmeyen platformlar da stub ile sarılıyor.
- **Build hataları giderildi:**
  - `worker.ts`: `MarketplaceProduct.brandId` tipi `string` olacak şekilde `trendyolBrandId` → `String(trendyolBrandId)` dönüşümü eklendi.
  - `worker.ts`: `processOrderSync` return’unda duplicate `storeId` kaldırıldı.
  - `trendyol-order-sync.ts`: `rawPayload` Prisma `InputJsonValue` ile uyumlu olacak şekilde cast edildi.
  - `reset-password` ve dashboard sayfaları: `useSearchParams` için root layout’ta `TopRouteLoader` Suspense ile sarıldı; `reset-password` için `dynamic = 'force-dynamic'` kullanıldı.

---

## 2. Merkezi Yapı & Tipler

- **src/types:**
  - `src/types/api.ts`: `PaginatedResponse`, `ApiErrorResponse`, `ApiSuccessResponse` tanımlandı.
  - `src/types/index.ts`: API, marketplace ve integration tiplerinin merkezi re-export’u.
- **src/hooks:**
  - `useDebounce`: Arama/filtre gecikmesi.
  - `useStoreId`: Mağaza listesi ve seçili storeId state’i.
  - `usePagination`: Sayfa/limit, skip, hasNext/hasPrev.
- **Unused adapter:** `src/lib/integrations/adapters/marketplace/HepsiburadaAdapter.ts` (eski, `MarketplaceIntegrationBase` kullanan) kaldırıldı. Aktif kullanım `src/services/marketplaces/hepsiburada.adapter.ts` üzerinden.

---

## 3. Sipariş & Ürün Senkronizasyonu

- **Sipariş normalizasyonu:** `src/services/order-sync/trendyol-order-sync.ts` zaten Trendyol siparişlerini `Order` ve `OrderItem` olarak upsert ediyor. Değişiklik yok; akış çalışır durumda.
- **BullMQ repeatable job:** `src/lib/queue/schedule-order-sync.ts` eklendi. Worker başlarken (`pnpm run queue:dev`) aktif Trendyol bağlantısı olan her mağaza için 15 dakikada bir tekrarlayan `order-sync` job’ı eklenir. `run-workers.ts` bu fonksiyonu çağırıyor.
- **Ürün CRUD API:**
  - **POST /api/products:** Mağazada aktif Trendyol bağlantısı varsa `trendyolBrandId` ve `trendyolCategoryId` (≥1) zorunlu; yoksa 400 ve açıklayıcı mesaj. Bu alanlar create payload’a eklendi.
  - **PATCH /api/products/[id]:** Zaten mevcut; Trendyol alanları (`trendyolBrandId`, `trendyolCategoryId`) güncellenebilir.

---

## 4. Rate Limit & Güvenlik

- **429 retry:** `src/services/marketplaces/trendyol-request.ts` içinde `fetchWithTrendyolRetry` zaten var: 429/502/503/504 için `Retry-After` veya exponential backoff ile yeniden deneme. Ek değişiklik yapılmadı.
- **Data isolation:** `src/lib/api-store-access.ts` eklendi:
  - `assertStoreAccess(storeId)`: Oturum ve store’un tenant’a ait olduğunu doğrular; yetkisiz erişimde 401/403/404 döner.
  - `isStoreInTenant(storeId, tenantId)`: Sadece store–tenant eşleşmesi kontrolü.
  - **Örnek kullanım:** `src/app/api/orders/route.ts` GET’te `storeId` varsa `assertStoreAccess`, yoksa oturumdaki tenant’a ait mağazalarla filtre uygulanıyor.

---

## 5. Test & CI/CD

- **Vitest:** Projeye Vitest eklendi. `vitest.config.ts` path alias `@` ile yapılandırıldı.
- **Smoke testler:**
  - `src/lib/auth.test.ts`: Auth helper’lar (`getCurrentTenantId`, `getCurrentUserId`, `getCurrentPlan`) export ve oturum yokken null dönmesi.
  - `src/services/order-sync/trendyol-order-sync.test.ts`: `syncTrendyolOrders` export ve bağlantı yokken hata fırlatması (mock’lu).
  - `src/services/xml/xml-processor.test.ts`: `processXmlFeed` ve `processXmlFeedToBatch` export’ları (mock’lu).
- **package.json:** `"test": "vitest run"`, `"test:watch": "vitest"` script’leri eklendi.
- **GitHub Actions:** `.github/workflows/docker-build.yml` güncellendi:
  - İş adı: CI.
  - Yeni job `lint-build-test`: pnpm install, prisma generate, **pnpm lint**, **pnpm build**, **pnpm test**. Biri başarısız olursa pipeline durur.
  - `docker` job’ı `lint-build-test` başarılı olduktan sonra Docker image build eder.

---

## Çalıştırma

- **Build:** `pnpm build` (sıfır hata ile tamamlanmalı).
- **Test:** `pnpm test` (yerelde Rollup optional dependency uyarısı çıkarsa `pnpm install` tekrar deneyin; CI Linux’ta çalışır).
- **Worker (sipariş repeatable dahil):** `pnpm run queue:dev` (Redis gerekli).

Trendyol siparişleri panelde görüntülenebilir; periyodik çekim worker çalıştığında 15 dakikada bir otomatik tetiklenir.
