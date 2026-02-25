/**
 * Test XML import akışını tetikler: API'den bir mağaza alır, xml-import job'ı oluşturur.
 * Önce Redis + (isteğe bağlı) worker çalışıyor olmalı. Next.js dev server çalışıyor olmalı (test XML public'ten sunulur).
 *
 * Kullanım: pnpm run test:xml-import
 *          BASE_URL=http://localhost:3000 STORE_ID=xxx pnpm run test:xml-import  # isteğe bağlı
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const STORE_ID = process.env.STORE_ID;
const TEST_XML_URL = `${BASE_URL}/test-feed.xml`;

async function main() {
  let storeId = STORE_ID;

  if (!storeId) {
    const res = await fetch(`${BASE_URL}/api/stores`);
    if (!res.ok) {
      console.error('Mağaza listesi alınamadı. Önce Next.js dev server çalıştırın: pnpm dev');
      process.exit(1);
    }
    const stores = (await res.json()) as Array<{ id: string; name: string }>;
    if (!stores.length) {
      console.error('Hiç mağaza yok. Önce bir mağaza oluşturun (dashboard veya seed).');
      process.exit(1);
    }
    storeId = stores[0].id;
    console.log(`Mağaza seçildi: ${stores[0].name} (${storeId})`);
  }

  console.log(`XML import tetikleniyor: ${TEST_XML_URL}`);
  const importRes = await fetch(`${BASE_URL}/api/stores/${storeId}/xml-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xmlUrl: TEST_XML_URL }),
  });

  if (!importRes.ok) {
    const err = await importRes.json().catch(() => ({}));
    console.error('XML import başlatılamadı:', importRes.status, err);
    process.exit(1);
  }

  const { jobId } = (await importRes.json()) as { jobId: string };
  console.log('Job oluşturuldu:', jobId);
  console.log('Worker çalışıyorsa (pnpm run queue:dev veya RUN_WORKERS=1 pnpm dev) ürünler işlenecek ve marketplace-sync kuyruğuna düşecek.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
