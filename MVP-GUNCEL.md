# OmniCore – MVP Güncel (v2)

Bu belge **güncel MVP kapsamını** ve **sonraki aşama fikirlerini** özetler. Planlanan tüm MVP maddeleri tamamlanmış durumdadır.

---

## 1. Sistem Tanımı

**OmniCore**, B2C, B2B, pazaryeri, e-fatura ve muhasebe çözümlerini tek platformda toplayan kurumsal e-ticaret ekosistemidir.

| Katman | Teknoloji |
|--------|-----------|
| Frontend / API | Next.js 15 (App Router), TypeScript |
| Veritabanı | PostgreSQL (multi-tenant) |
| Kuyruk | Redis, BullMQ |
| UI | Shadcn/UI, Tailwind, Framer Motion |

---

## 2. MVP Kapsamı (Tamamlanan)

Aşağıdaki özellikler MVP kapsamında **tamamlanmış** kabul edilir.

### 2.1 Çekirdek
- [x] Multi-tenant (Tenant, Store)
- [x] Kategori yönetimi (hiyerarşik ağaç, CRUD, ikon)
- [x] Katalog gezgini (mağaza → kategori → ürün)
- [x] Ürün listesi (filtre, sayfalama, pazaryerine yükleme)
- [x] **Ürün CRUD formu** (tek ürün ekleme/düzenleme, kategori, fiyat, stok, görsel URL)
- [x] XML import (URL, sihirbaz, etiket eşleme, seçimli aktarım, kategori)

### 2.2 Dashboard
- [x] Ana dashboard (sipariş/ürün/mağaza, son siparişler)
- [x] Entegrasyon durumu, import kuyruğu, sync izleme
- [x] AI kategori eşleştirme inceleme

### 2.3 Pazaryeri
- [x] Bağlantı yönetimi (ekleme, silme, test et ve kaydet)
- [x] Trendyol / Hepsiburada ve diğer platformlar (factory + adapter)
- [x] Marketplace health API
- [x] Credential şifreleme, rate limit

### 2.4 Siparişler
- [x] Sipariş listesi, detay sheet
- [x] **Sipariş durumu güncelleme** (liste + detayda dropdown)
- [x] **Sipariş filtreleri** (tarih aralığı, platform, ödeme durumu)

### 2.5 Muhasebe & Ödeme
- [x] Muhasebe sayfası (entegrasyon listesi, Test et, Senkronize et, lastSyncAt/syncError)
- [x] Accounting worker (sync/healthCheck, einvoice_send, einvoice_query)
- [x] **Ödemeler sayfası** (PayTR, İyzico, Cari/Havale, Banka transferi – CRUD)

### 2.6 Lojistik
- [x] Lojistik sayfası (Yurtiçi, Aras, MNG, PTT vb. ayarlar, CRUD)
- [x] Test et endpoint (stub)

### 2.7 B2B
- [x] **B2B sayfası:** B2B müşteri CRUD (cari kod, unvan, vergi no, e-posta)
- [x] Fiyat listesi (müşteriye bağlı), fiyat listesine ürün ekleme/çıkarma (fiyat, min adet)

### 2.8 İletişim (Worker)
- [x] General kuyruğunda **SMS_SEND** ve **EMAIL_SEND** işleyen kod (stub; NetGSM/MasGSM/SMTP ileride)

### 2.9 Diğer
- [x] AI soru-cevap, Destek sayfası, kategori önerileri
- [x] Araçlar (job listesi, XML tetikleme), audit log
- [x] Production build (`pnpm build` – gerekirse `rm -rf .next && pnpm build`)

---

## 3. MVP Özet Tablo

| Modül | Durum | Not |
|-------|--------|-----|
| Çekirdek (mağaza, kategori, ürün, XML) | ✅ | Ürün CRUD dahil |
| Dashboard | ✅ | |
| Pazaryeri | ✅ | Health API dahil |
| Siparişler | ✅ | Durum + filtreler |
| Muhasebe | ✅ | Test, sync, worker |
| Ödemeler | ✅ | Entegrasyon CRUD |
| Lojistik | ✅ | Ayarlar + Test stub |
| B2B | ✅ | Müşteri + fiyat listesi |
| SMS/E-posta worker | ✅ | Stub işleyici |
| Build | ✅ | .next temizlenince |

---

## 4. Sonraki Aşama (Opsiyonel)

MVP sonrası eklenebilecek özellikler (öncelik sırası yok).

### Raporlama & Analitik
- Satış raporları (günlük/haftalık/aylık)
- Ürün performansı, stok uyarıları
- Excel/CSV export

### Yetkilendirme
- Rol tabanlı erişim (admin, mağaza yöneticisi)
- TenantUser yönetim sayfası

### Ürün & Katalog
- Toplu fiyat/stok güncelleme
- Varyant yönetimi (beden, renk)
- Ürün çoğaltma

### Pazaryeri
- Sync özeti (başarılı/başarısız)
- Webhook dinleme

### Müşteri & İletişim
- Müşteri portali (sipariş takip)
- Sipariş bildirimi şablonları (SMS/e-posta)
- Gerçek NetGSM / MasGSM / SMTP entegrasyonu

### Altyapı
- Health check endpoint’leri (DB, Redis, kuyruk)
- Hata izleme (Sentry vb.)
- Docker Compose (app + worker + PostgreSQL + Redis)

### Yerelleştirme
- UI dil seçimi (TR/EN)
- Para birimi ve tarih formatı

---

## 5. Yayın Öncesi Kontrol Listesi

- [x] `pnpm build` hatasız
- [ ] Pazaryeri (Trendyol/Hepsiburada) uçtan uca test
- [ ] XML import uçtan uca test
- [ ] Sipariş listesi ve durum güncelleme test
- [ ] AI soru-cevap test (API key)
- [ ] `.env` örnekleri dokümante

---

*Bu dosya mevcut MVP tamamlanmış duruma göre oluşturulmuştur. Eski planlı/eksik listesi için `MVP.md` dosyasına bakılabilir.*
