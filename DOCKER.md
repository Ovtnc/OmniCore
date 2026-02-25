# OmniCore – Production Docker

Canlı ortamda çalıştırmak için Docker mimarisi: App (Next.js), Worker (BullMQ), PostgreSQL, Redis.

## Bileşenler

| Servis   | Açıklama                    | Port (host) |
|----------|-----------------------------|-------------|
| **app**  | Next.js 15 (Frontend + API) | 3000        |
| **worker** | BullMQ kuyruk işleyicisi  | —           |
| **postgres** | PostgreSQL 16           | 5432 (localhost) |
| **redis**   | Redis 7 (kuyruk + cache) | 6379 (localhost) |

## Yerel geliştirme – Pazaryeri sync

Ürünleri pazaryerine (Trendyol, Hepsiburada vb.) göndermek için yalnızca uygulama (`pnpm run dev`) yeterli değildir:

1. **Redis** çalışıyor olmalı (örn. `pnpm run docker:redis` veya `docker run -d -p 6379:6379 redis`).
2. **Worker** ayrı bir terminalde çalışmalı: `pnpm run queue:dev`.

"Pazaryerine Gönder" veya "Yüklemeyi başlat" ile ürünler kuyruğa eklenir; işlenmesi worker tarafından yapılır. Worker çalışmıyorsa ürünler pazaryerine gitmez.

## Hızlı başlangıç

```bash
# 1. Production env iskeletini kopyala ve düzenle
cp .env.production.example .env.production
# POSTGRES_PASSWORD, NEXTAUTH_SECRET, ENCRYPTION_KEY vb. zorunlu alanları doldur

# 2. Image build (pnpm build aşaması dahil)
docker compose build

# 3. Servisleri ayağa kaldır
docker compose --env-file .env.production up -d

# 4. Uygulama: http://localhost:3000
```

## Build doğrulama (hatasız kanıt)

Docker image içinde `pnpm build` aynı adımları kullanır: `pnpm install --frozen-lockfile` → `prisma generate` → `pnpm build`. Build sürecini kanıtlamak için:

**Yerel (Docker olmadan):**
```bash
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm build
```
Başarısız olursa önce önbelleği temizleyin: `rm -rf .next` sonra tekrar `pnpm build`.

**Docker ile:**
```bash
# Docker Desktop'ı başlatın, ardından:
docker build -t omnicore-app:latest .
# veya sadece app servisi:
docker compose build app
```
Image başarıyla build olursa container içinde Next.js production build hatasız tamamlanmış demektir.

## Volume stratejisi ve yedekleme

- **postgres_data:** Kalıcı veritabanı verisi (`omnicore_postgres_data`).
- **postgres_backup:** Yedekler için ayrı volume (`omnicore_postgres_backup`). İsteğe bağlı olarak host dizinine veya S3’e de yedek alınabilir.
- **redis_data:** Redis AOF verisi (`omnicore_redis_data`).

### PostgreSQL yedek (manuel)

```bash
# Host’a tek seferlik yedek
docker compose exec -T postgres pg_dump -U omnicore omnicore | gzip > backup-$(date +%Y%m%d).sql.gz

# Veya script ile (backups/ dizinine yazar)
chmod +x scripts/backup-postgres.sh
./scripts/backup-postgres.sh
```

### Restore

```bash
gunzip -c backup-YYYYMMDD.sql.gz | docker compose exec -T postgres psql -U omnicore omnicore
```

## Ortam değişkenleri

Zorunlu alanlar (`.env.production`):

- `POSTGRES_PASSWORD` – Veritabanı şifresi.
- `NEXTAUTH_SECRET` – Oturum gizliliği (`openssl rand -base64 32`).
- `ENCRYPTION_KEY` – Credential şifreleme (32 byte hex, `openssl rand -hex 32`).
- `NEXT_PUBLIC_APP_URL` – Uygulama kök URL (örn. `https://your-domain.com`).

Opsiyonel: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `REDIS_PASSWORD`, Cloudflare, S3.

Compose, `POSTGRES_*` ve `REDIS_PASSWORD` ile `DATABASE_URL` ve `REDIS_URL` değerlerini app/worker için otomatik üretir.

## Migration

App container ilk ayağa kalkarken `docker-entrypoint.sh` şunları dener:

1. `prisma migrate deploy`
2. Başarısızsa (migration yoksa): `prisma db push`

İlk kurulumda schema’yı migration ile açmak için:

```bash
docker compose run --rm app pnpm exec prisma migrate deploy
```

## Ölçeklendirme

- **App:** Replica sayısı artırılabilir (`docker compose up -d --scale app=2`). Öncesinde bir load balancer (Traefik, Nginx) ile 3000 portunu dağıtın.
- **Worker:** Aynı Redis’i kullanan birden fazla worker çalıştırılabilir: `--scale worker=2`.

## Build notları

- Image tek bir Dockerfile ile üretilir; app ve worker aynı image’ı kullanır, worker için sadece `command` değişir.
- Build sırasında `pnpm build` ve `prisma generate` çalışır; hata alırsanız önce yerelde `pnpm build` ile doğrulayın.
- Worker, production’da `tsx` ile `src/lib/queue/run-workers.ts` çalıştırır (`pnpm run queue`).

## CI'da build

Hazır workflow: **`.github/workflows/docker-build.yml`** — `main` branch’e push veya PR’da `docker compose build` çalıştırır (placeholder env ile; secret gerekmez).

Secret'ları CI'da tutup sadece image build etmek için (deploy ayrı):

```yaml
# Örnek: Kendi workflow'unuzda
- name: Build Docker image
  run: docker compose build
  env:
    POSTGRES_USER: omnicore
    POSTGRES_PASSWORD: placeholder
    POSTGRES_DB: omnicore
    REDIS_PASSWORD: ""
```

Gerçek deploy için `.env.production` (veya CI secret'ları) ile `docker compose --env-file .env.production up -d` kullanın; secret'ları asla repoya koymayın.
