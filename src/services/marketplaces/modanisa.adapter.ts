/**
 * ModaNisa API adapter (stub – ileride entegrasyon)
 */

import { StubMarketplaceAdapter } from './stub.adapter';

export class ModaNisaAdapter extends StubMarketplaceAdapter {
  constructor(platform: string = 'MODANISA') {
    super(platform);
  }
}
