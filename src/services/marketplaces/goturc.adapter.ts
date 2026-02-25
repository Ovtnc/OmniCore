/**
 * GoTurc API adapter (stub – ileride entegrasyon)
 */

import { StubMarketplaceAdapter } from './stub.adapter';

export class GoTurcAdapter extends StubMarketplaceAdapter {
  constructor(platform: string = 'GOTURC') {
    super(platform);
  }
}
