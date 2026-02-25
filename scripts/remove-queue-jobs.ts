/**
 * Kuyruktaki job'ları iptal eder (siler).
 * Kullanım: pnpm exec tsx scripts/remove-queue-jobs.ts 369 370 371 379 380
 * Veya: pnpm run queue:remove -- 369 370 371 379 380
 */

import { marketplaceSyncQueue } from '../src/lib/queue/queues';

const jobIds = process.argv.slice(2).filter((id) => /^\d+$/.test(id));
if (jobIds.length === 0) {
  console.log('Kullanım: pnpm exec tsx scripts/remove-queue-jobs.ts <jobId1> [jobId2] ...');
  console.log('Örnek: pnpm exec tsx scripts/remove-queue-jobs.ts 369 370 371 379 380');
  process.exit(1);
}

async function main() {
  let hadLocked = false;
  for (const id of jobIds) {
    try {
      const job = await marketplaceSyncQueue.getJob(id);
      if (!job) {
        console.log(`Job ${id} bulunamadı (zaten işlendi veya silinmiş).`);
        continue;
      }
      try {
        await job.remove();
        console.log(`Job ${id} kuyruktan silindi.`);
      } catch (removeErr: unknown) {
        const msg = (removeErr as Error)?.message ?? String(removeErr);
        if (msg.includes('locked')) {
          hadLocked = true;
          console.log(`Job ${id} şu an işleniyor (kilitli), atlandı.`);
        } else {
          throw removeErr;
        }
      }
    } catch (e) {
      console.error(`Job ${id}:`, (e as Error)?.message ?? e);
    }
  }
  if (hadLocked) {
    console.log('\nKilitli işleri silmek için: Worker\'ı durdurun (Ctrl+C), 1-2 dakika bekleyin, sonra bu komutu tekrar çalıştırın.');
  }
  process.exit(0);
}

main();
