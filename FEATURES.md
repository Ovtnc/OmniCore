# OmniCore – Özellik Listesi ve Durum

Bu belge projedeki özelliklerin **ne çalışıyor**, **ne çalışmıyor** olduğunu özetler.

---

## Genel bakış

| Durum | Açıklama |
|--------|-----------|
| ✅ **Çalışıyor** | Akış uçtan uca çalışır (API + UI) |
| ⚠️ **Kısmen** | Kod/şema var; UI veya entegrasyon eksik / stub |
| ❌ **Çalışmıyor / Planlı** | Build hatası, eksik kod veya henüz yapılmadı |

---

## Derleme (Build) durumu

| Durum | Not |
|--------|-----|
| ❌ **`pnpm build` şu an başarısız** | `src/lib/integrations/IntegrationManager.ts`: Prisma `MarketplacePlatform` enum’unda PAZARAMA, IDEFIX, GOTURC, PTTAVM, MODANISA, ALLESGO var; bu dosyadaki `marketplaceAdapters` Record’unda tanımlı değil. `/api/marketplace/health` bu dosyayı kullanıyor. |
| ✅ **`pnpm dev` çalışır** | Geliştirme sunucusu açılır; yalnızca production build kırık. |

**Öneri:** Health API’yi `@/services/marketplaces` (factory) kullanacak şekilde değiştirmek veya IntegrationManager’a eksik platformları (stub veya mevcut adapter) eklemek build’i düzeltir.

---

## 1. Çekirdek (Tenant, Mağaza, Katalog)

| Özellik | Durum | Not |
|--------|--------|-----|
| Multi-tenant (Tenant, Store) | ✅ Çalışıyor | Prisma şema, `/api/stores`, Mağazalar sayfası (liste, oluşturma) |
| **Kategori yönetimi** | ✅ Çalışıyor | Hiyerarşik kategori (parent/child), `/categories` sayfası: ağaç listesi, ekle/düzenle/sil, üst kategori seçimi, Lucide ikon, mağaza bağlantısı. `getCategoriesTree`, `createCategory`, `updateCategory`, `deleteCategory` server actions. Aynı mağaza + aynı üst altında isim tekrarı Zod ile engelleniyor. |
| **Katalog gezgini (klasör görünümü)** | ✅ Çalışıyor | `/products` klasör modu: Mağazalar → Kategoriler → Ürünler. Breadcrumb, “Tüm ürünler” kartı, ürün kartları (görsel, SKU, fiyat, pazaryeri badge). `/api/catalog/explorer?storeId=&categoryId=` |
| Ürün listesi | ✅ Çalışıyor | `/api/products?storeId=&limit=`, Ürünler sayfası (liste görünümü: filtre, sayfalama, checkbox, “Yüklemeyi başlat”) |
| Ürün CRUD (ekleme/düzenleme formu) | ⚠️ Kısmen | API’de sadece liste/import var; tam ürün ekleme/düzenleme formu yok |

---

## 2. Dashboard

| Özellik | Durum | Not |
|--------|--------|-----|
| Ana dashboard | ✅ Çalışıyor | Sipariş/ürün/mağaza sayıları, son siparişler, entegrasyon özeti |
| İstatistik kartları | ✅ Çalışıyor | `DashboardStats`, teslim oranı, progress |
| Son siparişler | ✅ Çalışıyor | `RecentOrders` – gerçek veri |
| Entegrasyon durumu | ✅ Çalışıyor | `IntegrationStatus` – pazaryeri/muhasebe sayıları |
| Import kuyruğu durumu | ✅ Çalışıyor | `ImportQueueStatus` |
| Sync izleme | ✅ Çalışıyor | `SyncMonitor` |
| AI eşleştirme inceleme | ✅ Çalışıyor | `AIMatchReview` |
| Platform sağlık | ⚠️ Kısmen | `PlatformHealth` bileşeni var; `/api/marketplace/health` şu an build hatası nedeniyle kullanılamıyor (IntegrationManager) |

---

## 3. Pazaryeri (Marketplace)

| Özellik | Durum | Not |
|--------|--------|-----|
| Pazaryeri bağlantı yönetimi | ✅ Çalışıyor | Marketplace sayfası: bağlantı listesi, ekleme, silme, “Test et ve kaydet”. API: GET/POST/DELETE, test endpoint. Credential şifreleme (AES-256-GCM). |
| Trendyol / Hepsiburada | ✅ Çalışıyor | `services/marketplaces`: TrendyolAdapter, HepsiburadaAdapter – ürün gönderimi, sipariş çekme (gerçek API). Worker `getMarketplaceAdapter` ile bu factory’i kullanıyor. |
| Amazon, N11, Shopify, Çiçeksepeti, Pazarama, İdefix, GoTurc, PTT Avm, ModaNisa, Allesgo | ✅ Çalışıyor | `services/marketplaces/factory.ts` içinde adapter’lar tanımlı (bazıları stub değil). Worker ve test bu factory’i kullanır. |
| Diğer platformlar (WooCommerce, Magento, Cimri, Akakçe, vb.) | ✅ Çalışıyor | Stub adapter ile factory’de tanımlı; bağlantı kaydedilir, gerçek API çağrısı yok. |
| Rate limit yönetimi | ✅ Çalışıyor | Base adapter ve bağlantıda `rateLimitRemaining` vb. |
| **Marketplace health API** | ❌ Çalışmıyor | `GET /api/marketplace/health` – IntegrationManager import ettiği için build hatası; enum/registry uyumsuzluğu. |

---

## 4. XML Import & Kuyruklar

| Özellik | Durum | Not |
|--------|--------|-----|
| XML import API | ✅ Çalışıyor | `POST /api/stores/[storeId]/xml-import` – xmlUrl ile kuyruğa ekler |
| XML import worker | ✅ Çalışıyor | `xml-import` kuyruğu, `processXmlFeed` / `processXmlFeedToBatch` ile işleme |
| XML → ürün parse | ✅ Çalışıyor | `xml-processor`: ürünler DB’ye yazılır, marketplace-sync tetiklenir |
| **XML’den kategori** | ✅ Çalışıyor | XML’de `category` / `category_name` / `kategori` / `cat` (veya eşleme ile “Kategori” alanı). Kategori yoksa oluşturulur, ürün kategoriye bağlanır. Seçimli import’ta `XmlImportItem.categoryName` saklanır, confirm’da ProductCategory atanır. |
| XML Sihirbazı | ✅ Çalışıyor | Adımlar: URL → Etiket analizi → Etiket eşleştirme (Kategori dahil) → Ön izleme (sayfalı, arama, filtre) → Seçili ürünleri aktar. `ProductPreviewTable`’da kategori kolonu. |
| BullMQ kuyrukları | ✅ Çalışıyor | product-sync, marketplace-sync, accounting, xml-import, xml-feed, general |
| Queue worker | ✅ Çalışıyor | `pnpm queue:dev` – xml-import, marketplace-sync, product-sync işlenir |
| Kuyruk istatistikleri | ✅ Çalışıyor | `/api/queue/stats` |
| Araçlar sayfası (Job listesi, XML tetikleme) | ✅ Çalışıyor | Mağaza seçimi, XML URL, job listesi, durumlar |

---

## 5. AI

| Özellik | Durum | Not |
|--------|--------|-----|
| Müşteri sorusu cevaplama | ✅ Çalışıyor | `answer-question` servisi (OpenAI / Gemini); API key gerekir |
| Soru-cevap API | ✅ Çalışıyor | `POST /api/ai/answer-question` |
| Müşteri soruları kaydı | ✅ Çalışıyor | `CustomerQuestion` modeli, store questions API |
| Destek (Soru-Cevap) sayfası | ✅ Çalışıyor | Mağaza/ürün seçimi, soru gir, AI cevap, kaydet; son sorular listesi |
| Kategori önerileri / eşleştirme | ✅ Çalışıyor | `/api/ai/category-suggestions`, `/api/ai/match-category` |
| AI kategori eşleştirme (dashboard) | ✅ Çalışıyor | `AIMatchReview` bileşeni |

---

## 6. Muhasebe & E-Fatura

| Özellik | Durum | Not |
|--------|--------|-----|
| Muhasebe sayfası | ⚠️ Kısmen | Açıklama + “Dashboard’a dön”; işlev yok |
| Logo / Paraşüt adapter | ⚠️ Kısmen | `lib/integrations/adapters/accounting/` – sınıflar var, tam akış yok |
| Accounting job | ⚠️ Kısmen | Worker’da `processAccounting` sadece log atıyor |
| E-fatura / ödeme (PayTR, İyzico, vb.) | ❌ Planlı | README’de; ayrı sayfa/akış yok |

---

## 7. Lojistik & Kargo

| Özellik | Durum | Not |
|--------|--------|-----|
| Lojistik sayfası | ⚠️ Kısmen | Açıklama + “Dashboard’a dön” |
| Lojistik şeması | ✅ Çalışıyor | `LogisticsSetting` modeli mevcut |
| Yurtiçi, Aras, MNG, PTT API | ❌ Planlı | Kod yok |

---

## 8. Siparişler & B2B

| Özellik | Durum | Not |
|--------|--------|-----|
| Sipariş modeli | ✅ Çalışıyor | `Order`, `OrderItem` – dashboard’da sayı ve son siparişler kullanılıyor |
| Siparişler sayfası | ⚠️ Kısmen | Başlık + “Dashboard’a dön”; liste/filtre yok |
| B2B şema | ✅ Çalışıyor | `B2BCustomer`, `B2BPriceList`, `B2BPriceListProduct` |
| B2B UI / API | ❌ Planlı | Ayrı sayfa/endpoint yok |

---

## 9. Denetim & Güvenlik

| Özellik | Durum | Not |
|--------|--------|-----|
| Audit log | ✅ Çalışıyor | `AuditLog` modeli, `createAuditLog()`; mağaza bazlı izolasyon |
| Rate limit (pazaryeri) | ✅ Çalışıyor | Base adapter’da bekleme ve sayaç |

---

## 10. Diğer sayfalar

| Sayfa | Durum | Not |
|-------|--------|-----|
| Raporlar | ⚠️ Kısmen | “Yakında eklenecek” placeholder |
| Ayarlar | ⚠️ Kısmen | “Yakında eklenecek” placeholder |
| **Ürünler** | ✅ Çalışıyor | Liste görünümü + Klasör görünümü (katalog gezgini), “Kategoriler” linki, XML Sihirbazı, Yüklemeyi başlat |
| **Kategoriler** | ✅ Çalışıyor | `/categories` – ağaç, yeni kategori (modal), düzenle/sil, mağaza seçimi |

---

## 11. İletişim (SMS / E-posta)

| Özellik | Durum | Not |
|--------|--------|-----|
| Job tipleri | ✅ Çalışıyor | `SMS_SEND`, `EMAIL_SEND` tanımlı; general kuyruğu var |
| NetGSM / MasGSM / SMTP | ❌ Planlı | Worker’da işleyen kod yok |

---

## Özet

**Çalışan:**  
Dashboard, mağazalar, **kategori yönetimi (tree, CRUD, ikon)**, **katalog gezgini (klasör görünümü)**, ürün listesi, Trendyol/Hepsiburada ve diğer pazaryeri adapter’ları (factory), bağlantı yönetimi (test et ve kaydet), XML import (API + worker + sihirbaz + **kategori importu**), seçimli import (ön izleme, confirm, kategori kolonu), AI soru-cevap ve kategori eşleştirme, Destek sayfası, Job listesi ve kuyruk istatistikleri, audit log, rate limit.

**Kısmen:**  
Ürün CRUD formu, muhasebe/lojistik/sipariş sayfaları (placeholder), accounting worker stub, raporlar/ayarlar placeholder, marketplace health (kod var ama build kırık).

**Çalışmayan / Planlı:**  
- **`pnpm build`** – IntegrationManager enum/registry uyumsuzluğu nedeniyle başarısız.  
- E-fatura/ödeme akışları, kargo API’leri, B2B UI, SMS/e-posta işleyicileri.

Son güncelleme: kod incelemesi ve build/run durumuna göre güncellendi.
