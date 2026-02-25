/**
 * PTT Avm API adapter (stub – ileride entegrasyon)
 */

import { StubMarketplaceAdapter } from './stub.adapter';

export class PttavmAdapter extends StubMarketplaceAdapter {
  constructor(platform: string = 'PTTAVM') {
    super(platform);
  }
}
