/**
 * Allesgo API adapter (stub – ileride entegrasyon)
 */

import { StubMarketplaceAdapter } from './stub.adapter';

export class AllesgoAdapter extends StubMarketplaceAdapter {
  constructor(platform: string = 'ALLESGO') {
    super(platform);
  }
}
