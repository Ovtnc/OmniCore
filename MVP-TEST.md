# OmniCore – MVP Değişiklikleri Test Rehberi

Bu belge, MVP kapsamında yapılan değişiklikleri **anlamanız** ve **adım adım test etmeniz** için hazırlanmıştır. Her bölümde: ne değişti, nasıl test edilir, beklenen sonuç yer alır.

---

## Genel test ön koşulları

- **Yerel:** `pnpm install`, `.env` dolu (en azından `DATABASE_URL`), PostgreSQL + Redis çalışıyor (veya uygun stub).
- **Uygulama:** `pnpm dev` ile http://localhost:3000 açık.

---

## 1. Build süreci

### Ne değişti
- Production build bazen `.next` önbelleği yüzünden “Cannot find module for page: /b2b” veriyordu. Temiz build (önbellek yok) her zaman başarılı olacak şekilde kabul edildi.
- DOCKER.md içine “Build doğrulama” adımları eklendi.

### Nasıl test edilir

**1.1 Temiz build**
```bash
rm -rf .next
pnpm build
```
**Beklenen:** “Compiled successfully”, “Generating static pages (33/33)”, exit code 0. `/b2b` dahil tüm sayfalar listelenir.

**1.2 Docker build (Docker Desktop açıksa)**
```bash
docker build -t omnicore-app:latest .
```
**Beklenen:** Tüm stage’ler (deps, builder, runner) tamamlanır; “Successfully built” mesajı. Image içinde `pnpm build` çalışmış olur.

---

## 2. Docker (Production ortamı)

### Ne değişti
- **Dockerfile:** Multi-stage (deps → builder → runner). Next.js build + Prisma generate builder’da; runner’da sadece production bağımlılıkları ve `.next` kopyalanıyor. App ve worker aynı image, farklı CMD.
- **docker-compose.yml:** `app`, `worker`, `postgres`, `redis`; healthcheck’ler; volume’lar (postgres_data, postgres_backup, redis_data).
- **.env.production.example:** Zorunlu/opsiyonel env listesi, doldurma kontrol listesi.
- **docker-entrypoint.sh:** Sadece `pnpm start` iken `prisma migrate deploy` (veya `db push`) çalışıyor; worker etkilenmiyor.
- **scripts/backup-postgres.sh:** Host’tan `pg_dump` ile yedek alıyor.
- **.dockerignore:** Build context’i sadeleştiriyor.
- **.github/workflows/docker-build.yml:** Push/PR’da `docker compose build` ile image build doğrulaması.

### Nasıl test edilir

**2.1 Dockerfile build**
```bash
docker build -t omnicore-app:latest .
```
**Beklenen:** Build hatasız biter; “Successfully tagged omnicore-app:latest”.

**2.2 Compose ile servisleri ayağa kaldırma**
```bash
cp .env.production.example .env.production
# .env.production içinde en az POSTGRES_PASSWORD, NEXTAUTH_SECRET, ENCRYPTION_KEY doldur
docker compose --env-file .env.production up -d
```
**Beklenen:** `app`, `worker`, `postgres`, `redis` container’ları “Up” ve (healthcheck’ler geçince) “healthy”. http://localhost:3000 açılır.

**2.3 Yedek script**
```bash
chmod +x scripts/backup-postgres.sh
./scripts/backup-postgres.sh
```
**Beklenen:** `backups/` (veya BACKUP_DIR) içinde `backup-YYYYMMDD-HHMMSS.sql.gz` oluşur (compose ile postgres çalışıyorken).

**2.4 CI workflow**
- Repo’ya push veya `main`’e PR aç. GitHub Actions’ta “Docker build” workflow’u çalışsın.
**Beklenen:** “Build image” adımı yeşil; `docker compose build` hatasız tamamlanır.

---

## 3. Analitik ve Raporlama (/reports)

### Ne değişti
- **GET /api/analytics?period=day|week|month:** Ciro zaman serisi (date_trunc), en çok satan ürünler (OrderItem groupBy), düşük stok ürünler, pazaryeri dağılımı (Order.platform), özet (sipariş/ciro/ürün/düşük stok).
- **Sayfa /reports:** Özet kartlar, ciro grafiği (Recharts Area Chart, Günlük/Haftalık/Aylık seçimi), pazaryeri pie chart, “En çok satan ürünler” ve “Stoku azalan ürünler” tabloları, CSV ve Excel export.
- **Skeleton:** Yüklenirken kart ve grafik alanlarında animasyon.
- **UI:** Shadcn Card/Tabs/Table, tema renkleri (dark mode uyumlu).

### Nasıl test edilir

**3.1 API doğrudan**
Tarayıcı veya curl:
```bash
curl -s "http://localhost:3000/api/analytics?period=day" | head -c 500
```
**Beklenen:** JSON; `revenueTimeSeries`, `topProducts`, `lowStockProducts`, `byPlatform`, `summary` anahtarları var. Veri yoksa boş diziler/sıfırlar.

**3.2 Raporlar sayfası**
1. Sidebar’dan **Raporlar** tıkla → `/reports`.
2. Sayfa açılırken özet kartlar ve grafik alanları Skeleton ile dolmalı, sonra veri gelmeli.
**Beklenen:** Toplam sipariş, toplam ciro, toplam ürün, düşük stok kartları; Ciro Değişimi grafiği; Günlük / Haftalık / Aylık seçimi çalışır.

**3.3 Pazaryeri dağılımı**
Aynı sayfada “Pazaryeri Dağılımı” kartında pasta grafik.
**Beklenen:** Sipariş verisi varsa platformlar (Trendyol, Hepsiburada vb.) dilimler halinde; yoksa “Henüz platform verisi yok” benzeri mesaj.

**3.4 Tablolar**
- “En çok satan ürünler”: Ürün adı, SKU, adet, ciro.
- “Stoku azalan ürünler”: Ürün adı, SKU, stok (≤5 kırmızı), satış fiyatı.
**Beklenen:** Veri varsa satırlar listelenir; yoksa “Henüz sipariş verisi yok” / “Düşük stoklu ürün yok”.

**3.5 Export**
- **CSV:** “CSV” butonuna tıkla.
**Beklenen:** `omnicore-rapor-YYYY-MM-DD.csv` iner; özet, zaman serisi, en çok satanlar, düşük stok satırları UTF-8.
- **Excel:** “Excel” butonuna tıkla.
**Beklenen:** `omnicore-rapor-YYYY-MM-DD.xlsx` iner; sayfalar: Özet, En Çok Satanlar, Düşük Stok, Pazaryeri.

---

## 4. API düzeltmeleri (tip / Prisma)

### Ne değişti
- **GET /api/orders:** `platform` query parametresi artık Prisma tipi `MarketplacePlatform` ile kullanılıyor (string ataması kaldırıldı, tip hatası giderildi).
- **Ürün unique:** `findUnique` çağrıları mağaza + SKU için compound unique kullanıyor: `storeId_sku: { storeId, sku }` (Prisma şemadaki `@@unique([storeId, sku])` ile uyumlu).

### Nasıl test edilir

**4.1 Sipariş listesi – platform filtresi**
1. Siparişler sayfasına git (`/orders`).
2. Filtrelerde “Platform” seç (örn. Trendyol).
3. Liste isteği gider.
**Beklenen:** Sayfa hata vermez; API 200 döner; filtre uygulanmış siparişler (veya boş liste) görünür. Build’de orders route tip hatası olmaz.

**4.2 Ürün – aynı mağazada aynı SKU**
- Ürün eklerken veya düzenlerken, aynı mağazada zaten var olan bir SKU gir.
**Beklenen:** API 400 veya “Bu mağazada bu SKU zaten kullanılıyor” benzeri mesaj; sunucu hatası (500) veya Prisma “Unique constraint” çökmesi olmaz. Build’de products route / productId route tip hatası olmaz.

---

## 5. Özet kontrol listesi (MVP değişiklikleri)

Aşağıdakileri sırayla işaretleyerek tüm MVP değişikliklerini test edebilirsiniz.

| # | Test | Nasıl | Beklenen |
|---|------|--------|----------|
| 1 | Temiz build | `rm -rf .next && pnpm build` | Başarılı, 33 sayfa |
| 2 | Docker image build | `docker build -t omnicore-app .` | Image oluşur |
| 3 | Compose up | `.env.production` + `docker compose up -d` | 4 servis healthy, :3000 açılır |
| 4 | Raporlar sayfası | Sidebar → Raporlar | Skeleton sonra veri; grafik + tablolar |
| 5 | Analitik API | `GET /api/analytics?period=day` | JSON, 5 ana anahtar |
| 6 | CSV export | /reports → CSV butonu | .csv dosyası iner |
| 7 | Excel export | /reports → Excel butonu | .xlsx dosyası iner |
| 8 | Sipariş platform filtresi | /orders → Platform seç | Liste güncellenir, hata yok |
| 9 | Yedek script | `./scripts/backup-postgres.sh` | .sql.gz oluşur (postgres ayaktayken) |

---

## İlgili dosyalar (referans)

- **Build / Docker:** `Dockerfile`, `docker-compose.yml`, `DOCKER.md`, `.env.production.example`, `docker-entrypoint.sh`, `.dockerignore`, `scripts/backup-postgres.sh`, `.github/workflows/docker-build.yml`
- **Analitik:** `src/app/api/analytics/route.ts`, `src/app/(dashboard)/reports/page.tsx`, `src/components/ui/skeleton.tsx`
- **API düzeltmeleri:** `src/app/api/orders/route.ts`, `src/app/api/products/route.ts`, `src/app/api/products/[productId]/route.ts`
- **Kapsam özeti:** `MVP-GUNCEL.md`, `MVP.md`, `FEATURES.md`

Bu rehberi takip ederek MVP ile yapılan tüm değişiklikleri tek tek anlayıp test edebilirsiniz.
