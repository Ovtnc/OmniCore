/**
 * Worker process giriş noktası.
 * Çalıştırma: pnpm run queue:dev
 */
import { startWorkers } from './worker';

startWorkers();
console.log('OmniCore workers running: xml-import, product-sync, marketplace-sync, accounting, xml-feed, general');
