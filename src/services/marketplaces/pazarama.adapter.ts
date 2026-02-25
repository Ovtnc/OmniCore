/**
 * Pazarama API adapter (stub – ileride satıcı API)
 */

import { StubMarketplaceAdapter } from './stub.adapter';

export class PazaramaAdapter extends StubMarketplaceAdapter {
  constructor(platform: string = 'PAZARAMA') {
    super(platform);
  }
}
