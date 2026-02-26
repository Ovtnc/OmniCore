# Yapılacaklar ve Eksik Alanlar Rehberi

Bu dokümanda projeyi çalıştırmak ve Trendyol entegrasyonunu kullanmak için **yapmanız gerekenler** ile **hangi alanların zorunlu/eksik** olduğu listelenir.

---

## 1. Ortam (.env) – Eksik / Zorunlu Alanlar

| Alan | Zorunlu? | Açıklama |
|------|----------|----------|
| `DATABASE_URL` | ✅ Evet | PostgreSQL bağlantı dizesi. Yoksa uygulama açılmaz. |
| `REDIS_URL` | ✅ Evet | Redis adresi (örn. `redis://localhost:6379`). Kuyruk (worker) için gerekli. |
| `AUTH_SECRET` | ✅ Evet | NextAuth için. Üretmek: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | ✅ Evet | Uygulama URL’i (örn. `http://localhost:3000`). |
| `ENCRYPTION_KEY` | ⚠️ Production’da zorunlu | Pazaryeri API anahtarlarının şifrelenmesi. 64 karakter hex: `openssl rand -hex 32` |
| `REDIS_PASSWORD` | Hayır | Redis şifreliyse doldurulur. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Hayır | Google ile giriş istiyorsanız. |
| `CLOUDFLARE_*`, `AWS_*`, `RATE_LIMIT_*` | Hayır | İsteğe bağlı. |

**Kontrol:** `.env` dosyasında en azından `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` dolu olmalı.

---

## 2. Trendyol Bağlantısı – Form Alanları

Pazaryeri bağlantıları sayfasında **Trendyol** seçildiğinde:

| Alan | Zorunlu? | Nereye kaydedilir | Not |
|------|----------|-------------------|-----|
| **Satıcı ID / Supplier ID** | ✅ Evet | `sellerId` | Trendyol satıcı numarası (örn. 720669). |
| **API Key** | ✅ Evet | Şifreli (`apiKey`) | Trendyol Satıcı Paneli → Entegrasyon. |
| **API Secret** | ✅ Evet | Şifreli (`apiSecret`) | Aynı yerden. |
| **Entegratör Adı** | Hayır (varsayılan: OmniCore) | `extraConfig.integratorName` | 403 alırsanız "OmniCore" veya "SelfIntegration" yazın. |

**Eksik bırakılmaması gerekenler:** Satıcı ID, API Key, API Secret. Bunlar olmadan bağlantı testi ve ürün gönderimi çalışmaz.

---

## 3. Ürün – Trendyol’a Gönderim İçin Gerekli Alanlar

Bir ürünü Trendyol’a göndermek için aşağıdakiler **mutlaka** dolu olmalı:

| Alan | Zorunlu? | Nerede | Açıklama |
|------|----------|--------|----------|
| **Trendyol Marka ID** | ✅ Evet | Ürün formu / Product.trendyolBrandId | Trendyol marka listesindeki sayısal ID (örn. 123). |
| **Trendyol Kategori ID** | ✅ Evet | Ürün formu / Product.trendyolCategoryId | Trendyol kategori ağacındaki yaprak kategori ID (örn. 411). |
| **Barkod** veya **SKU** | ✅ Evet | Ürün formu | Barkod yoksa SKU kullanılır. |
| **Fiyat (liste / satış)** | ✅ Evet | Ürün formu | listPrice, salePrice. |
| **Birincil kategori** | Opsiyonel (lookup için) | Ürün–kategori ilişkisi | Kategori adı ile otomatik Trendyol kategori ID eşlemesi yapılır; kategori **External ID**’si Trendyol kategori ID ise doğrudan kullanılır. |
| **Marka (metin)** | Opsiyonel (lookup için) | Product.brand | Otomatik marka ID eşlemesi için. |

**Sık karşılaşılan hata:** "Marka ID ve Kategori ID zorunludur (0 olamaz)" → Ürünü düzenleyip **Trendyol Marka ID** ve **Trendyol Kategori ID** alanlarını Trendyol paneli veya API dokümanından alarak doldurun. Veya birincil kategoriye **External ID** olarak Trendyol kategori ID’sini yazın; marka için ürün **Marka** alanı Trendyol’daki marka adıyla aynı olursa otomatik eşleme denenecek.

---

## 4. Sipariş Senkronizasyonu – Yapılacaklar

Trendyol siparişlerini veritabanına çekmek için:

| Adım | Açıklama |
|------|----------|
| 1. Worker çalışıyor olsun | `pnpm run queue:dev` (Redis gerekli). |
| 2. Sipariş sync’i tetikleyin | `POST /api/stores/{storeId}/order-sync` (body: `{"lastDays": 7}`). Veya curl ile. |
| 3. Mağaza ID | URL’deki `storeId` veya `GET /api/stores` ile dönen mağaza `id` alanı. |

**Eksik olursa:** Worker çalışmıyorsa job kuyruğa alınır ama siparişler yazılmaz. StoreId yanlışsa 404 veya “aktif Trendyol bağlantısı yok” hatası alırsınız.

---

## 5. Genel Yapılacaklar Listesi

- [ ] **.env** – `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` dolu.
- [ ] **Veritabanı** – `pnpm db:push` veya `pnpm db:migrate` ile şema güncel.
- [ ] **Redis** – Çalışıyor (örn. `docker run -p 6379:6379 redis` veya yerel Redis).
- [ ] **Trendyol bağlantısı** – Satıcı ID, API Key, API Secret girildi; test bağlantısı başarılı.
- [ ] **Ürünler** – Trendyol’a göndermek istediğiniz ürünlerde **Trendyol Marka ID** ve **Trendyol Kategori ID** dolu (veya birincil kategori External ID + marka adı ile otomatik eşleme sağlanıyor).
- [ ] **Worker** – `pnpm run queue:dev` ile kuyruk işleniyor (ürün gönderimi + sipariş sync için).
- [ ] **Sipariş sync** – İsteniyorsa periyodik veya manuel `POST .../order-sync` çağrılıyor.

---

## 6. Hızlı Kontrol – Eksik Alan Özeti

| Bileşen | Eksik olunca ne olur? |
|---------|------------------------|
| .env `DATABASE_URL` | Uygulama açılmaz / DB hatası. |
| .env `REDIS_URL` | Kuyruk/worker çalışmaz. |
| Trendyol Satıcı ID / API Key / Secret | Bağlantı testi ve ürün gönderimi başarısız. |
| Üründe Trendyol Marka ID / Kategori ID | “Marka ID ve Kategori ID zorunludur” hatası; ürün Trendyol’a gitmez. |
| Worker çalışmıyor | Ürün ve sipariş job’ları kuyrukta kalır, işlenmez. |
| Store ID (sipariş sync) | Order-sync API’de 404 veya “aktif Trendyol bağlantısı yok”. |

Bu dokümanı güncel tutarak yeni zorunlu alan veya adım eklendiğinde listeyi genişletebilirsiniz.
