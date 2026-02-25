# Veri İzolasyonu ve Rate Limiting

## Data Isolation (Veri İzolasyonu)

Multi-tenant yapıda **bir mağazanın verisi diğerine asla karışmamalıdır**.

- **Prisma sorgularında** store-scoped tüm listeleme/güncelleme/silme işlemlerinde `where: { storeId }` kullanın.
- **API route'larında** `storeId` parametresi veya body'den alınmalı; kullanıcı sadece kendi mağaza verisine erişebilmeli (ileride auth + tenant eşlemesi ile).
- **Audit log:** `src/lib/audit.ts` — `createAuditLog({ storeId, action, entityType, ... })` ile işlem kaydı; raporlarda `where: { storeId }` ile filtreleyin.

## Rate Limiting

- **BullMQ worker'lar:** Zaten rate limit (ensureRateLimit) ve retry/backoff kullanılıyor; pazaryeri API'leri aşırı çağrılmaz.
- **API route'lar:** İleride Redis tabanlı rate limit (örn. `@upstash/ratelimit`) veya middleware ile istek başına mağaza/kullanıcı limiti eklenebilir. "Sınırsız XML" yüklemeleri zaten kuyruğa alındığı için sunucu bloke olmaz.

## Audit Logs (İşlem Kayıtları)

- Model: `AuditLog` (storeId, userId, action, entityType, entityId, payload, ip, createdAt).
- Kullanım: Fatura iptali, stok güncellemesi, sipariş iptali vb. kritik işlemlerde `createAuditLog(...)` çağrılabilir.
- Rapor: "Bu faturayı kim iptal etti?" → `AuditLog` tablosunda `entityType: 'Invoice', entityId: '...'` ile sorgulayın.
