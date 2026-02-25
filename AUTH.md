# OmniCore – Kimlik Doğrulama (Auth)

NextAuth.js v5 (Auth.js) ile JWT tabanlı oturum, Credentials + Google OAuth ve multi-tenant kayıt akışı.

---

## Kurulum

### 1. Ortam değişkenleri

`.env` içinde (veya `.env.local`):

```bash
# Zorunlu – oturum imzası (openssl rand -base64 32)
AUTH_SECRET="..."
# veya NEXTAUTH_SECRET (Auth.js her ikisini de kabul eder)

# Google OAuth (opsiyonel)
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
```

Uygulama URL’i: `NEXTAUTH_URL` veya `AUTH_URL` (production’da genelde gerekmez; Next.js otomatik çıkarır).

### 2. Veritabanı migration

Şemaya `User`, `Account`, `Session`, `VerificationToken` ve `TenantUser.user` ilişkisi eklendi. İlk kez uyguluyorsanız:

```bash
pnpm exec prisma migrate dev --name add_auth_models
```

Production’da:

```bash
pnpm exec prisma migrate deploy
```

---

## Akışlar

### Kayıt (Credentials)

1. Kullanıcı `/register` sayfasında ad, e-posta, şifre (ve tekrar) girer.
2. Server Action `register()` (bkz. `src/lib/auth-actions.ts`):
   - Zod ile validasyon (şifre en az 8 karakter, harf + rakam).
   - E-posta benzersiz mi kontrol.
   - Şifre `bcrypt` (round 12) ile hashlenir.
   - Sırayla: `User` → `Tenant` (slug: isim + timestamp) → `Store` (Ana Mağaza, slug: default) → `TenantUser` (role: OWNER).
3. Başarılıysa `/login?registered=1` yönlendirmesi; kullanıcı giriş yapar.

### Giriş (Credentials)

1. `/login` → e-posta + şifre.
2. NextAuth Credentials provider: `User` e-posta ile bulunur, `bcrypt.compare` ile şifre doğrulanır.
3. JWT’ye `tenantId`, `plan`, `role` (ilk TenantUser kaydından) yazılır.

### Google OAuth

1. `/login` veya `/register` üzerinden “Google ile giriş/kayıt”.
2. Yeni kullanıcıysa: Adapter `User` + `Account` oluşturur; `createUser` / `linkAccount` event’inde `createDefaultTenantAndStore()` ile Tenant + Store + TenantUser (OWNER) oluşturulur.
3. Oturum JWT; yine `tenantId`, `plan`, `role` session’da taşınır.

---

## Korumalı rotalar (Middleware)

`src/middleware.ts`, `auth()` ile tüm istekleri işler. `auth.ts` içindeki `authorized` callback:

- `/login`, `/register` → her zaman izin.
- `/`, `/orders`, `/products`, `/stores`, … (dashboard altı) → giriş yoksa **`/login`** yönlendirmesi.

Korumalı path’ler: `/`, `/orders`, `/products`, `/stores`, `/categories`, `/marketplace`, `/accounting`, `/payments`, `/logistics`, `/b2b`, `/reports`, `/support`, `/settings`, `/tools`, `/xml-wizard`.

---

## Session ve SaaS plan

Oturumda (JWT) taşınan alanlar:

- `user.id`, `user.email`, `user.name`, `user.image`
- **`user.tenantId`** – aktif tenant (ilk TenantUser’a göre).
- **`user.plan`** – `STARTER` | `GROWTH` | `ENTERPRISE` (Tenant.plan).
- **`user.role`** – `OWNER` | `ADMIN` | `MEMBER` | `VIEWER` (TenantUser.role).

Paket kısıtlamaları (ör. STARTER’da 1 mağaza) için:

- Server tarafında: `const session = await auth(); session?.user?.plan`.
- İstersen `src/lib/auth.ts` içindeki `getCurrentPlan()` ile kullan.

---

## Tenant izolasyonu (API / Server)

Tüm tenant-bazlı API ve server logic’te **mutlaka** `tenantId` kullanın:

```ts
import { getCurrentTenantId } from '@/lib/auth';

export async function GET() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stores = await prisma.store.findMany({
    where: { tenantId },
  });
  return NextResponse.json(stores);
}
```

- Siparişler, ürünler, mağazalar vb. her zaman `where: { store: { tenantId } }` veya `where: { tenantId }` ile filtrelenmeli.
- Böylece bir tenant’ın kullanıcısı diğer tenant’ın verisini göremez.

---

## Dosya özeti

| Dosya | Açıklama |
|--------|----------|
| `src/auth.ts` | NextAuth config: Credentials + Google, JWT, callbacks (jwt, session, authorized), Tenant+Store oluşturma event’leri |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js handler (GET/POST) |
| `src/middleware.ts` | `auth()` ile rota koruma |
| `src/lib/auth-actions.ts` | Kayıt Server Action (User + Tenant + Store + TenantUser) |
| `src/lib/auth.ts` | `getCurrentTenantId()`, `getCurrentUserId()`, `getCurrentPlan()` |
| `src/components/auth/LoginForm.tsx` | Giriş formu (e-posta/şifre + Google) |
| `src/components/auth/RegisterForm.tsx` | Kayıt formu (ad, e-posta, şifre, tekrar + Google) |
| `src/app/login/page.tsx` | Login sayfası |
| `src/app/register/page.tsx` | Register sayfası |
| `src/components/providers/session-provider.tsx` | `SessionProvider` (client) |

---

## Ödeme / paket aktivasyonu (ileri adım)

Kullanıcı kayıt olduktan sonra paket seçimine yönlendirilebilir. Ödemeler sayfası ile entegre edildiğinde, ödeme başarılı olduğunda ilgili tenant’ın `plan` alanı (ör. `GROWTH`) güncellenir; bir sonraki JWT yenilemesinde veya yeniden girişte session’daki `user.plan` da güncel olur.
