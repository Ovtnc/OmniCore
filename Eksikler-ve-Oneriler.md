# OmniCore – Eksikler ve Öneriler

Bu dokümanda projenin **eksik kalan alanları**, **teknik borçlar** ve **geliştirme önerileri** tek yerde toplanmıştır. Mevcut rehberlerle (Yapılacaklar, Trendyol, Auth, Docker, FEATURES) birlikte kullanılabilir.

---

## 1. Build ve Production

| Eksik / Sorun | Öneri |
|---------------|--------|
| **`pnpm build` başarısız olabiliyor** | `src/lib/integrations/IntegrationManager.ts` içindeki `marketplaceAdapters` kaydı, Prisma `MarketplacePlatform` enum’undaki tüm platformları (PAZARAMA, IDEFIX, GOTURC, PTTAVM, MODANISA, ALLESGO vb.) kapsamıyor. Health API zaten `@/services/marketplaces` factory kullanıyorsa bu dosyayı kullanan başka yerler (örn. accounting test) enum ile uyumlu hale getirilmeli veya health/adapters tek kaynaktan (factory) alınmalı. |
| **CI’da sadece Docker build** | `.github/workflows/docker-build.yml` yalnızca `docker compose build` çalıştırıyor; `pnpm lint` ve `pnpm build` eklenmemiş. Build/lint başarısız olsa da CI yeşil kalabilir. |

**Öneriler:**
- IntegrationManager’ı kullanan tüm noktaları tespit edin; mümkünse adapter erişimini tek kaynaktan (`@/services/marketplaces`) yapın.
- CI’a adımlar ekleyin: `pnpm install`, `pnpm lint`, `pnpm build` (ve ileride `pnpm test`).

---

## 2. Test Altyapısı

| Eksik | Öneri |
|-------|--------|
| **Unit / entegrasyon testi yok** | Jest veya Vitest ile unit testler; API route’ları ve servisler için entegrasyon testleri yazılabilir. |
| **E2E test yok** | Playwright veya Cypress ile kritik akışlar (giriş, mağaza oluşturma, pazaryeri bağlantısı, XML import) otomatikleştirilebilir. |
| **Sadece script’ler var** | `test:xml-import`, `smoke:api` gibi script’ler manuel/yarı otomatik; CI’da çalışan standart test komutu yok. |

**Öneriler:**
- `pnpm test` ile çalışan bir test suite (Vitest önerilir – Next.js ile uyumlu) ekleyin.
- En azından kritik API’ler (auth, stores, products, order-sync) için smoke veya entegrasyon testleri yazın.
- CI’da `pnpm test` (ve varsa E2E) çalıştırın.

---

## 3. Kod Yapısı ve Tipler

| Eksik | Öneri |
|-------|--------|
| **Merkezi `src/types` yok** | Tipler şu an modüllere dağılmış (`lib/integrations/types.ts`, `services/marketplaces/types.ts`, `components/.../catalog-explorer-types.ts`). Paylaşılan alanlar için `src/types/` (örn. `api.ts`, `marketplace.ts`) oluşturulabilir. |
| **Merkezi `src/hooks` yok** | Özel hook’lar bileşen/sayfa dosyalarında. Tekrar kullanılacak hook’lar (örn. pagination, form, modal state) `src/hooks/` altında toplanabilir. |
| **ESLint config** | Sadece `eslint-config-next` kullanılıyor; projeye özel kurallar (import sırası, naming) istenirse ayrı config dosyası eklenebilir. |

**Öneriler:**
- Yeni paylaşılan tipler için `src/types` kullanın; mevcut dağınık tipleri zamanla buraya taşıyın.
- Sık kullanılan hook’lar için `src/hooks` açın (usePagination, useDebounce, useStoreId vb.).

---

## 4. Sipariş Senkronizasyonu (Trendyol)

| Eksik | Öneri |
|-------|--------|
| **Siparişler DB’ye yazılmıyor** | TRENDYOL-ENTEGRASYON.md’de anlatıldığı gibi; sipariş normalize edilip `Order` / `OrderItem` olarak kaydedilmeli. Order-sync worker ve API tamamlanmalı. |
| **Periyodik sipariş çekme** | Şu an manuel `POST .../order-sync`. Cron veya tekrarlı job ile periyodik çekim eklenebilir. |

**Öneriler:**
- Trendyol siparişlerini normalize eden servisi ve worker adımını tamamlayın (TRENDYOL-ENTEGRASYON.md’deki adımlar).
- İsteğe bağlı: BullMQ repeatable job veya dış cron ile periyodik order-sync.

---

## 5. Ürün Yönetimi

| Eksik | Öneri |
|-------|--------|
| **Tam ürün CRUD API / form** | Ürün listesi ve XML import var; tek ürün ekleme/düzenleme için tam form ve ilgili API (POST/PATCH `/api/products`, zorunlu alanlar) eksik. |
| **Ürün silme** | `bulk-delete` var; tek ürün silme ve soft-delete politikası netleştirilebilir. |

**Öneriler:**
- Ürün oluşturma/düzenleme için tek sayfa veya sheet + `POST /api/products`, `PATCH /api/products/[productId]` tamamlayın.
- Trendyol’a gönderim için zorunlu alanlar (marka ID, kategori ID, barkod, fiyat) YAPILACAKLAR-VE-EKSIK-ALANLAR.md ile uyumlu tutulsun.

---

## 6. Pazaryeri ve Rate Limit

| Eksik | Öneri |
|-------|--------|
| **429 (rate limit) sonrası retry** | Trendyol 429 döndüğünde otomatik retry veya backoff yok. Adapter veya kuyruk job’ında retry politikası (örn. exponential backoff) eklenebilir. |
| **Health API kullanımı** | `/api/marketplace/health` factory kullanıyorsa build sorunu buradan değil; IntegrationManager kullanan diğer yerler düzeltilmeli. Platform sağlık UI’ı (PlatformHealth) bu API’ye güvenmeye devam edebilir. |

**Öneriler:**
- Trendyol (ve gerekirse diğer) adapter’da 429 cevabında retry + uygun bekleme süresi ekleyin.
- Rate limit bilgisini (header veya response) loglayıp gerekirse kuyruk hızını ayarlayın.

---

## 7. Güvenlik ve Operasyon

| Eksik | Öneri |
|-------|--------|
| **.env örnekleri** | `.env.example` ve `.env.production.example` var; yorumlarla zorunlu/opsiyonel alanlar açıklanmış. Yeni env eklendiğinde bu dosyalar güncellenmeli. |
| **Audit log kullanımı** | `lib/audit.ts` ve AuditLog modeli mevcut; kritik aksiyonlar (bağlantı ekleme/silme, toplu silme, şifre sıfırlama) için audit kaydı tutulabilir. |
| **Veri izolasyonu** | docs/DATA_ISOLATION_AND_RATE_LIMITS.md’de storeId ile izolasyon anlatılmış; tüm store-scoped API’lerde tenant/store kontrolü tutarlı uygulanmalı. |

**Öneriler:**
- Hassas işlemlerde audit log yazın; gerekirse admin panelinde audit listesi ekleyin.
- Yeni API yazarken tenant/store yetkisini middleware veya ortak helper ile merkezileştirin.

---

## 8. Dokümantasyon ve Onboarding

| Eksik | Öneri |
|-------|--------|
| **Dağınık dokümanlar** | YAPILACAKLAR-VE-EKSIK-ALANLAR.md, TRENDYOL-ENTEGRASYON.md, AUTH.md, DOCKER.md, FEATURES.md, docs/DATA_ISOLATION_AND_RATE_LIMITS.md ayrı ayrı. Yeni geliştiriciler için tek bir “Başlarken” veya “Proje Rehberi” indeksi oluşturulabilir. |
| **API dokümantasyonu** | API route’lar için OpenAPI/Swagger veya en azından markdown listesi (endpoint, method, body, response) faydalı olur. |

**Öneriler:**
- README’de “İlgili dokümanlar” bölümüne bu dosyayı ve diğer rehberleri linkleyin.
- İleride API referansı (manuel veya otomatik) ekleyin.

---

## 9. Özet Öncelik Listesi

| Öncelik | Konu | Kısa aksiyon |
|---------|------|--------------|
| 1 | Build | IntegrationManager / factory uyumunu sağlayın; `pnpm build`’in geçmesini sağlayın. |
| 2 | CI | Workflow’a lint ve build (ve mümkünse test) ekleyin. |
| 3 | Sipariş sync | Trendyol siparişlerini DB’ye yazan akışı tamamlayın. |
| 4 | Ürün CRUD | Tek ürün ekleme/düzenleme API ve form. |
| 5 | Test | Vitest (veya Jest) + temel testler; CI’da çalıştırın. |
| 6 | Rate limit | 429 sonrası retry/backoff (Trendyol adapter veya job). |
| 7 | Tipler / hook’lar | `src/types`, `src/hooks` ile merkezi yapı. |
| 8 | Dokümantasyon | Başlarken indeksi ve API özeti. |

---

## 10. İlgili Dosyalar

- **Ortam ve alanlar:** [YAPILACAKLAR-VE-EKSIK-ALANLAR.md](./YAPILACAKLAR-VE-EKSIK-ALANLAR.md)
- **Trendyol detay:** [TRENDYOL-ENTEGRASYON.md](./TRENDYOL-ENTEGRASYON.md)
- **Auth:** [AUTH.md](./AUTH.md)
- **Docker / worker:** [DOCKER.md](./DOCKER.md)
- **Özellik durumu:** [FEATURES.md](./FEATURES.md)
- **Veri izolasyonu / rate limit:** [docs/DATA_ISOLATION_AND_RATE_LIMITS.md](./docs/DATA_ISOLATION_AND_RATE_LIMITS.md)

Bu dosyayı güncel tutarak yeni eksik veya öneri gördüğünüzde listeyi genişletebilirsiniz.
