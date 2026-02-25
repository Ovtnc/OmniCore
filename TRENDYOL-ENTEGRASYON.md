# Trendyol Entegrasyonu – Nasıl Çalışır, Sorunlar ve Yapılacaklar

Bu dokümanda OmniCore içindeki Trendyol entegrasyonunun mimarisi, çalışan/çalışmayan kısımlar ve sizin yapmanız gerekenler özetlenir.

---

## 1. Genel Mimari

Trendyol ile haberleşme **tek bir adapter** üzerinden yapılır:

- **Kullanılan adapter:** `src/services/marketplaces/trendyol.adapter.ts`  
  (Factory: `src/services/marketplaces/factory.ts` → `getMarketplaceAdapter('TRENDYOL')`)

**Not:** Tek yetkili adapter `src/services/marketplaces/trendyol.adapter.ts` dosyasıdır. (Eski `lib/integrations/adapters/marketplace/TrendyolAdapter.ts` kaldırıldı.)

- **API taban URL:** `https://apigw.trendyol.com`
- **Kimlik doğrulama:** `Basic base64(apiKey:apiSecret)` + **User-Agent** (Trendyol 403 verir yoksa)
- **User-Agent formatı:** `"Satıcı Id - EntegratörAdı"` veya `"Satıcı Id - SelfIntegration"`, en fazla 30 karakter  
  - Bağlantı kaydında `extraConfig.integratorName` varsa o kullanılır; boş/`"Self"` ise `SelfIntegration`, yoksa `OmniCore`.

---

## 2. Akış Özeti

### 2.1 Bağlantı kurma

1. **Pazaryeri bağlantıları** sayfasından Trendyol seçilir.
2. **Satıcı ID (sellerId)**, **API Key** ve **API Secret** girilir (şifreli saklanır).
3. İsteğe bağlı: **extraConfig** içinde `integratorName` verilirse User-Agent’ta kullanılır.
4. **Test bağlantısı** çağrıldığında adapter `fetchOrders(connection)` çağırır; başarılıysa bağlantı “çalışıyor” kabul edilir.

### 2.2 Ürün gönderme (Trendyol’a ürün / fiyat-stok)

1. Tetikleyici: **Ürün detaydan “Mağazaya yolla”** veya **XML içe aktarma** sonrası marketplace sync kuyruğuna ekleme.
2. **Worker** (`src/lib/queue/worker.ts` → `processMarketplaceSync`):
   - Ürünü DB’den okur.
   - Trendyol için **trendyolBrandId** ve **trendyolCategoryId** gerekir:
     - Ürün kaydında doluysa doğrudan kullanılır.
     - Yoksa **birincil kategori adı** ve **marka adı** ile `resolveTrendyolIds(storeId, brand, categoryName)` çağrılır (mağazanın aktif Trendyol bağlantısı + Trendyol marka/kategori API’leri kullanılır).
   - `getMarketplaceAdapter('TRENDYOL')` ile adapter alınır, `sendProduct(marketplaceProduct, connection)` çağrılır.
3. **Adapter** (`trendyol.adapter.ts`):
   - Önce barkod ile ürünün Trendyol’da olup olmadığını kontrol eder (`getProductsByBarcode`).
   - **Varsa:** Sadece fiyat/stok günceller (`updatePriceAndStock`).
   - **Yoksa:** `brandId` ve `categoryId` 0 ise hata fırlatır; değilse `POST .../v2/products` ile yeni ürün gönderir.
   - “Tekrarlı ürün oluşturma” (recurring) hatası gelirse yine fiyat/stok güncellemesine düşer.

### 2.3 Marka / kategori eşlemesi (lookup)

- **Dosya:** `src/services/trendyol-lookup.ts`
- Mağazanın **ilk aktif Trendyol bağlantısı** kullanılır; `getBrands` ve `getCategoryTree` ile listeler alınır, 5 dakika cache’lenir.
- **XML içe aktarma** ve **ürün sync** sırasında marka/kategori **adı** veya **sayısal ID** ile Trendyol `brandId` / `categoryId` bulunur.
- Ürün formunda ve XML eşleme alanlarında **Trendyol Marka ID** ve **Trendyol Kategori ID** elle de girilebilir.

### 2.4 XML içe aktarma

- XML’deki alanlar `trendyolBrandId` / `trendyolCategoryId` (veya eşlenen etiketler) ile sayısal ID veya metin olarak gelir.
- `xml-processor.ts` içinde `resolveTrendyolIds` ile marka/kategori adından ID çözülür; ürün kaydına yazılır.
- İçe aktarma sonrası ürünler **marketplace-sync** kuyruğuna eklenebilir (skipMarketplaceSync yoksa).

---

## 3. Çalışan Özellikler

| Özellik | Durum | Açıklama |
|--------|--------|-----------|
| Bağlantı kaydı | ✅ | API Key, Secret, Satıcı ID + extraConfig (örn. integratorName) kaydedilir. |
| Bağlantı testi | ✅ | `fetchOrders` ile test; başarılı/başarısız dönüş. |
| Ürün gönderme (yeni) | ✅ | brandId/categoryId doluysa `POST .../v2/products` ile ürün oluşturulur. |
| Ürün zaten varsa fiyat/stok | ✅ | Barkod ile kontrol; varsa sadece fiyat/stok güncellenir. |
| Tekrarlı ürün hatası | ✅ | 400 + recurring hatası gelirse otomatik fiyat/stok güncellemesine düşer. |
| Marka listesi API | ✅ | `getBrands` sayfalı çağrı. |
| Kategori ağacı API | ✅ | `getCategoryTree` tek çağrı. |
| Marka/kategori lookup | ✅ | `resolveTrendyolIds` ile XML ve sync sırasında otomatik eşleme. |
| Fiyat/stok güncelleme | ✅ | `updateStock`, `updatePrice`, `updatePriceAndStock` tek endpoint. |
| Ürün formu Trendyol alanları | ✅ | Trendyol Marka ID ve Kategori ID alanları mevcut. |
| XML eşleme | ✅ | trendyolBrandId / trendyolCategoryId eşlenebilir ve önerilir. |
| Worker ile sync | ✅ | marketplace-sync kuyruğu tek ürün bazlı Trendyol’a gönderir. |

---

## 4. Sorunlar ve Eksikler

### 4.1 Siparişler DB’ye yazılmıyor

- **Durum:** `fetchOrders` çağrılıyor (bağlantı testi ve adapter içi) ve Trendyol’dan sipariş listesi alınıyor.
- **Eksik:** Bu yanıt **hiçbir yerde** normalize edilip `Order` / `OrderItem` tablolarına yazılmıyor. Yani Trendyol siparişleri otomatik olarak uygulama sipariş listesine **hiç gelmiyor**.
- **Yapılması gereken:**  
  - Trendyol sipariş yanıt formatına uygun bir **normalize** katmanı (ör. `NormalizedOrderPayload`).  
  - Periyodik veya manuel tetiklenen bir **sipariş senkronizasyonu** (job/API) ile `fetchOrders` sonucunun DB’ye yazılması.

### 4.2 User-Agent / Entegratör adı

- Trendyol, User-Agent’ı zorunlu tutuyor; yoksa 403 dönebiliyor.
- Adapter `extraConfig.integratorName` kullanıyor ama **pazaryeri bağlantı formunda** bu alan kullanıcıya gösterilmiyor; sadece genel “extra” alanlar var.
- **Risk:** Kullanıcı “Entegratör adı” girmeden bağlantı kurarsa 403 alabilir.  
- **Yapılması gereken:** Trendyol için formda açık bir “Entegratör adı” (veya “User-Agent adı”) alanı eklenmeli ve `extraConfig.integratorName` ile kaydedilmeli; placeholder’da “SelfIntegration” veya “OmniCore” örnek verilebilir.

### 4.3 Rate limit

- Dokümantasyonda: aynı endpoint’e 10 saniyede en fazla 50 istek; aşımda 429.
- Uygulamada **429 sonrası bekleme / retry** veya **istek aralığı** (throttle) yok; toplu ürün gönderiminde rate limit’e takılma riski var.
- **Yapılması gereken:** 429 yanıtında retry-after veya sabit gecikme ile tekrar deneme ve/veya queue tarafında istek sıklığının sınırlanması.

### 4.4 Sipariş endpoint parametreleri

- Şu an `GET .../integration/order/sellers/{sellerId}/orders` parametresiz çağrılıyor.
- Trendyol API’de **status**, **startDate**, **endDate**, **page**, **size** vb. parametreler var; hepsi boş bırakılıyor.
- Sipariş senkronizasyonu eklendiğinde bu parametrelerle (tarih aralığı, sayfalama, durum) çağrı yapılması daha doğru olur.

### 4.5 İki farklı Trendyol adapter’ı

- `src/services/marketplaces/trendyol.adapter.ts` → **gerçek API** kullanılıyor (ürün, stok, sipariş listesi).
- `src/lib/integrations/adapters/marketplace/TrendyolAdapter.ts` → **kullanılmıyor**; içinde “TODO: Gerçek API” ve “TODO: Trendyol orders API” var.
- Karışıklığı önlemek için ya eski adapter kaldırılmalı ya da net bir notla “kullanılmıyor” denmeli.

### 4.6 product-sync job’unda marketplace gönderimi

- `worker.ts` içinde `type === 'marketplace'` ve `productIds` dolu olduğunda aslında **gerçek pazaryeri gönderimi yapılmıyor**; sadece progress güncelleniyor.
- Gerçek gönderim **marketplace-sync** kuyruğunda, ürün bazlı yapılıyor. Yani toplu “ürünleri Trendyol’a gönder” akışı, product-sync job’ına değil, her ürün için marketplace-sync’e bağlı.
- Bu tasarım bilinçli olabilir; ancak “product-sync ile Trendyol’a gönderiyorum” beklentisi varsa akışın dokümante edilmesi veya product-sync’in marketplace-sync’i tetiklemesi gerekebilir.

---

## 5. Sizin Yapmanız Gerekenler (Öncelik sırasıyla)

1. **Trendyol bağlantısı**
   - Satıcı panelinden **API Key** ve **API Secret** alın.
   - **Satıcı ID** (sellerId) doğru girilsin.
   - 403 alırsanız: Bağlantıda **extraConfig** ile `integratorName` ekleyin (ör. `SelfIntegration` veya `OmniCore`). İleride formda “Entegratör adı” alanı çıkarsa oradan da doldurulabilir.

2. **Ürün gönderimi**
   - Her ürün için **Trendyol Marka ID** ve **Trendyol Kategori ID** zorunlu. Bunlar:
     - Ürün düzenleme formunda elle girilebilir, veya
     - Birincil kategori + marka adı ile `resolveTrendyolIds` otomatik doldurulur (mağazada aktif Trendyol bağlantısı ve Trendyol’da eşleşen marka/kategori gerekir).
   - Kategori eşlemesi için kategorinin **External ID**’sini Trendyol kategori ID’si yapabilirsiniz; worker önce ürünün `trendyolCategoryId` alanına bakıyor.
   - Ürünü **barkod veya SKU** ile gönderiyorsunuz; Trendyol’da aynı barkod varsa sadece fiyat/stok güncellenir.

3. **Siparişler**
   - Şu an Trendyol’dan gelen siparişler otomatik olarak uygulamaya **aktarılmıyor**. Siparişleri görmek için ya bu normalizasyon + Order kaydı akışı geliştirilmeli ya da geçici olarak Trendyol panelinden takip edilmeli.

4. **Toplu işlem ve rate limit**
   - Çok sayıda ürünü aynı anda gönderirseniz 429 riski var. Mümkünse ürün sayısını azaltarak veya aralıklı tetikleyerek test edin; kalıcı çözüm için 429 retry ve throttle eklenmeli.

5. **Docker / worker**
   - Ürünleri pazaryerine (Trendyol dahil) göndermek için **uygulama (örn. `pnpm run dev`) tek başına yeterli değil**; **Redis + worker** çalışıyor olmalı. `DOCKER.md`’de belirtildiği gibi worker’ın ayağa kalktığından emin olun.

---

## 6. Özet Tablo

| Konu | Çalışıyor mu? | Not |
|------|----------------|-----|
| Bağlantı (kayıt + test) | ✅ | User-Agent için integratorName gerekebilir. |
| Ürün oluşturma (v2/products) | ✅ | brandId + categoryId zorunlu. |
| Fiyat/stok güncelleme | ✅ | Barkod ile. |
| Marka/kategori lookup | ✅ | XML ve sync’te kullanılıyor. |
| Sipariş listesi API çağrısı | ✅ | Sadece test ve ham veri. |
| Siparişlerin DB’ye yazılması | ❌ | Normalize + kayıt akışı yok. |
| Rate limit / 429 yönetimi | ❌ | Retry/throttle yok. |
| Formda “Entegratör adı” | ❌ | extraConfig ile manuel girilebilir. |

Bu doküman, mevcut koda göre hazırlanmıştır; Trendyol API değişikliklerinde adapter ve bu özet güncellenmelidir.

---

## Mağaza ID nedir?

**Mağaza ID**, veritabanındaki `Store` kaydının benzersiz kimliğidir (CUID, örn. `clxx4abc123def456`). Hangi mağazanın Trendyol siparişlerini çekeceğini belirtmek için kullanılır.

**Nereden bulunur?**

1. **API:** `GET http://localhost:3000/api/stores` → dönen her mağazanın `id` alanı.
2. **Panel:** Mağazalar / Pazaryeri bağlantıları / Ürünler sayfasında mağaza seçince isteklerde veya URL’de geçen storeId.
3. **Prisma Studio:** `pnpm db:studio` → Store tablosu → id sütunu.

---

## Sipariş sync tetikleme (API)

Yerel geliştirme (`pnpm run dev` + `pnpm run queue:dev` çalışıyorken):

```bash
# MAĞAZA_ID: Siparişleri çekmek istediğin mağazanın ID'si (Prisma Studio veya Siparişler/Ürünler sayfası URL’inden alabilirsin)
curl -X POST "http://localhost:3000/api/stores/MAĞAZA_ID/order-sync" \
  -H "Content-Type: application/json" \
  -d '{"lastDays": 7}'
```

Opsiyonel body alanları: `lastDays` (varsayılan 7), `status` (örn. `"Created"`), `connectionId` (belirli Trendyol bağlantısı).
