# Yapılacaklar (Görev Listesi)

Proje için öncelikli ve planlanan görevler. Tamamladıkça `[ ]` → `[x]` işaretleyin.

---

## 🔴 Öncelikli (Hemen)

- [ ] **Production build düzelt** – `pnpm build` şu an başarısız. `IntegrationManager` veya `/api/marketplace/health`'i factory/StubAdapter kullanacak şekilde güncelle; eksik `MarketplacePlatform` enum değerlerini ekle veya health API'yi kaldır.
- [ ] **Siparişler sayfasını tamamla** – Sipariş listesi (filtre, arama, sayfalama), sipariş detay; şu an placeholder.
- [ ] **Ürün CRUD** – Tek ürün ekleme/düzenleme formu (API + UI); şu an sadece liste ve XML import var.

---

## 🟠 Kısa Vade

- [ ] **Muhasebe sayfası** – Logo/Paraşüt bağlantı kurma, sync, e-fatura tetikleme (worker `processAccounting` gerçek akışa bağlansın).
- [ ] **Lojistik sayfası** – Kargo ayarları (Yurtiçi, Aras, MNG, PTT vb.) kayıt ve test.
- [ ] **Raporlar sayfası** – En azından basit sipariş/ürün özeti veya “Yakında” yerine gerçek içerik.
- [ ] **Ayarlar sayfası** – Tenant/mağaza ayarları veya genel tercihler.
- [ ] **Marketplace health** – `/api/marketplace/health` build hatasını gider; PlatformHealth bileşeninin çalışmasını sağla.

---

## 🟡 Orta Vade

- [ ] **B2B UI** – B2B müşteri listesi, fiyat listesi, sipariş oluşturma (şema hazır, sayfa/API yok).
- [ ] **E-fatura / ödeme** – PayTR, İyzico vb. entegrasyon akışı (sepet/ödeme sayfası veya API).
- [ ] **Kargo API** – Yurtiçi, Aras, MNG, PTT entegrasyonu (takip no, etiket vb.).
- [ ] **Hepsiburada sipariş sync** – Trendyol’daki gibi Hepsiburada için order sync servisi + BullMQ job (isteğe bağlı).

---

## 🟢 İsteğe Bağlı

- [ ] **SMS / E-posta** – NetGSM, MasGSM, SMTP; general kuyruğunda `SMS_SEND` / `EMAIL_SEND` işleyicisi.
- [ ] **Çoklu dil** – i18n (Türkçe/İngilizce) veya sadece Türkçe tutulabilir.
- [ ] **E2E test** – En az bir pazaryeri (Trendyol veya Hepsiburada) uçtan uca test senaryosu.

---

## 📌 Notlar

- **Kurulum / eksik alanlar:** `YAPILACAKLAR-VE-EKSIK-ALANLAR.md`
- **Trendyol detay:** `TRENDYOL-ENTEGRASYON.md`
- **Özellik durumu:** `FEATURES.md`

Bu dosyayı ihtiyaca göre güncelleyebilirsiniz.
