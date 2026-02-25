# OmniCore – MVP (Minimum Viable Product) Dokümanı

Bu belge OmniCore sisteminin **mevcut MVP kapsamını**, **eksik/planlı özellikleri** ve **ileride eklenebilecek ekstra özellikleri** özetler.

---

## 1. Sistem Özeti

**OmniCore**, B2C, B2B, pazaryeri, e-fatura ve muhasebe çözümlerini tek platformda toplayan kurumsal e-ticaret ekosistemidir.

| Katman | Teknoloji |
|--------|-----------|
| Frontend / API | Next.js 15 (App Router), TypeScript |
| Veritabanı | PostgreSQL (multi-tenant) |
| Kuyruk | Redis, BullMQ |
| UI | Shadcn/UI, Tailwind, Framer Motion |

---

## 2. MVP Kapsamı (Şu An Çalışan Özellikler)

### 2.1 Çekirdek
- [x] **Multi-tenant:** Tenant + Store modeli, mağaza listesi, oluşturma
- [x] **Kategori yönetimi:** Hiyerarşik ağaç, CRUD, üst kategori, ikon, mağaza bağlantısı
- [x] **Katalog gezgini:** Mağaza → Kategori → Ürün klasör görünümü, breadcrumb, ürün kartları
- [x] **Ürün listesi:** Filtre, sayfalama, checkbox, “Yüklemeyi başlat”
- [x] **XML import:** URL ile kuyruğa ekleme, worker ile işleme, kategori eşleme, sihirbaz (ön izleme, etiket eşleme, seçimli aktarım)

### 2.2 Dashboard
- [x] Ana dashboard (sipariş/ürün/mağaza sayıları)
- [x] İstatistik kartları, teslim oranı, progress
- [x] Son siparişler, entegrasyon durumu, import kuyruğu, sync izleme
- [x] AI eşleştirme inceleme (kategori önerileri)

### 2.3 Pazaryeri
- [x] Bağlantı yönetimi (ekleme, silme, “Test et ve kaydet”)
- [x] Trendyol / Hepsiburada gerçek API (ürün gönderimi, sipariş çekme)
- [x] Diğer platformlar (Amazon, N11, Shopify, Çiçeksepeti, Pazarama, İdefix, GoTurc, PTT Avm, ModaNisa, Allesgo) – factory + adapter
- [x] Credential şifreleme (AES-256-GCM), rate limit yönetimi

### 2.4 Siparişler
- [x] Sipariş listesi, filtre, sayfalama, durum etiketleri
- [x] Sipariş detay sheet (ürünler, adres, platform bilgisi)

### 2.5 AI & Destek
- [x] Müşteri sorusu cevaplama (OpenAI / Gemini)
- [x] Soru-cevap API ve kayıt (CustomerQuestion)
- [x] Destek sayfası (mağaza/ürün seçimi, AI cevap, son sorular)
- [x] Kategori önerileri / eşleştirme API ve dashboard bileşeni

### 2.6 Araçlar & Kuyruk
- [x] Job listesi, XML tetikleme (Araçlar sayfası)
- [x] BullMQ kuyrukları (product-sync, marketplace-sync, xml-import, accounting, general)
- [x] Queue worker, kuyruk istatistikleri API

### 2.7 Denetim
- [x] Audit log (mağaza bazlı), createAuditLog()

---

## 3. Eksik / Planlı Özellikler (MVP’ye Eklenebilir)

### 3.1 Kritik (MVP için önerilen)
| Özellik | Açıklama | Öncelik | Durum |
|---------|----------|---------|--------|
| **Production build düzeltmesi** | `.next` önbelleği temizlenince `pnpm build` başarılı; gerekirse `rm -rf .next && pnpm build` | Yüksek | ✅ Tamamlandı |
| **Ürün CRUD formu** | Tek ürün ekleme/düzenleme formu (API’de sadece liste/import var) | Yüksek | ✅ Tamamlandı |
| **Marketplace health API** | `GET /api/marketplace/health` factory kullanıyor, çalışır durumda | Orta | ✅ Mevcut |

### 3.2 Sipariş & Operasyon
| Özellik | Açıklama | Öncelik | Durum |
|---------|----------|---------|--------|
| Sipariş durumu güncelleme | Liste ve detay sheet üzerinden durum değiştirme (onayla, kargoya ver, iptal vb.) | Orta | ✅ Tamamlandı |
| Sipariş filtreleri geliştirme | Tarih aralığı (dateFrom/dateTo), platform, ödeme durumu (API + UI) | Düşük | ✅ Tamamlandı |

### 3.3 Muhasebe & Finans
| Özellik | Açıklama | Öncelik | Durum |
|---------|----------|---------|--------|
| Muhasebe sayfası işlevi | Bağlantı testi (Test et), senkronizasyon kuyruğa ekleme (Senkronize et), son test/syncError gösterimi | Orta | ✅ Tamamlandı |
| Accounting worker | processAccounting: sync (healthCheck), einvoice_send (sipariş→fatura), einvoice_query | Orta | ✅ Tamamlandı |
| E-fatura / ödeme | Ödemeler sayfası (PayTR, İyzico, Cari/Havale entegrasyonları), akış stub | Düşük | ✅ Tamamlandı |

### 3.4 Lojistik
| Özellik | Açıklama | Öncelik | Durum |
|---------|----------|---------|--------|
| Lojistik sayfası işlevi | Yurtiçi, Aras, MNG, PTT ayarları, Test et endpoint (stub) | Düşük | ✅ Tamamlandı |

### 3.5 B2B
| Özellik | Açıklama | Öncelik | Durum |
|---------|----------|---------|--------|
| B2B UI | B2BCustomer CRUD, B2BPriceList + ürün atama (fiyat, min adet) | Düşük | ✅ Tamamlandı |

### 3.6 İletişim
| Özellik | Açıklama | Öncelik | Durum |
|---------|----------|---------|--------|
| SMS / E-posta worker | general kuyruğunda SMS_SEND, EMAIL_SEND işleyen kod (stub) | Düşük | ✅ Tamamlandı |

---

## 4. Ekstra Özellikler (İleride Eklenebilir)

### 4.1 Raporlama & Analitik
- Satış raporları (günlük/haftalık/aylık, mağaza/pazaryeri bazlı)
- Ürün performans raporu (en çok satan, stok uyarısı)
- Dashboard grafikleri (recharts ile zaman serisi)
- Excel/CSV export

### 4.2 Kullanıcı & Yetkilendirme
- Rol tabanlı erişim (admin, mağaza yöneticisi, operasyon)
- Çoklu kullanıcı (TenantUser) yönetim sayfası
- Şifre sıfırlama, 2FA (opsiyonel)

### 4.3 Ürün & Katalog
- Toplu fiyat/stok güncelleme
- Varyant yönetimi (beden, renk)
- Barkod/SKU çakışma kontrolü
- Ürün çoğaltma (duplicate)

### 4.4 Pazaryeri
- Stok/fiyat tek yönlü sync özeti (ne gönderildi, ne başarısız)
- Çoklu pazaryeri aynı anda karşılaştırma
- Marketplace bildirimleri (webhook) dinleme

### 4.5 Müşteri Deneyimi
- Müşteri portali (sipariş takip, adres defteri)
- E-posta/SMS sipariş bildirimi şablonları
- İade/iptal self-servis

### 4.6 Altyapı & DevOps
- Health check endpoint’leri (DB, Redis, kuyruk)
- Log aggregation, hata izleme (Sentry benzeri)
- Yedekleme (DB + S3) otomasyonu
- Docker Compose ile tam stack (app + worker + PostgreSQL + Redis)

### 4.7 Yerelleştirme & Çoklu Dil
- UI dil seçimi (TR/EN)
- Para birimi ve tarih formatı ayarları

---

## 5. Özet Tablo

| Kategori | MVP’de var | Eksik/planlı | Ekstra (opsiyonel) |
|----------|------------|--------------|---------------------|
| Çekirdek (tenant, mağaza, kategori, ürün listesi, XML) | ✅ | Ürün CRUD formu | Toplu güncelleme, varyant |
| Dashboard | ✅ | — | Gelişmiş grafikler |
| Pazaryeri | ✅ | Health API, build fix | Sync özeti, webhook |
| Siparişler | ✅ | Durum güncelleme UI | Müşteri portali |
| AI & Destek | ✅ | — | — |
| Muhasebe / E-fatura | Kısmen (sayfa stub) | Tam akış | — |
| Lojistik | Stub | Kargo API’leri | — |
| B2B | Şema var | B2B UI | — |
| İletişim (SMS/e-posta) | Job tipi var | Worker işleyicisi | Şablon yönetimi |
| Raporlar / Ayarlar | Placeholder | İçerik | Gelişmiş raporlar |
| Build | ❌ (production) | IntegrationManager fix | — |

---

## 6. MVP Checklist (Yayın Öncesi)

- [x] `pnpm build` hatasız çalışıyor (gerekirse `rm -rf .next && pnpm build`)
- [ ] En az bir pazaryeri (Trendyol veya Hepsiburada) uçtan uca test edildi
- [ ] XML import (URL → kuyruk → worker → ürün + kategori) test edildi
- [ ] Sipariş listesi ve detay sheet test edildi
- [ ] AI soru-cevap (API key ile) test edildi
- [ ] `.env` örnekleri dokümante (DATABASE_URL, REDIS_URL, API keys)

---

*Son güncelleme: FEATURES.md ve kod incelemesine göre hazırlanmıştır.*
